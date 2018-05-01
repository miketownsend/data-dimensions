const _ = require('lodash')
const FilterFactories = require('./filters')

class Dimension {
  /**
   * @param {object} options
   * @param {string} options.id Unique Id for this dimension.
   * @param {?string} options.name Display name for this dimension
   * @param {function:string} options.groupSeries Function to determine how to group data points into series.
   * @param {function:string} options.groupData Function to determine how to group data points within a series.
   * @param {function:object} options.reduceInit Function which returns initial series object
   * @param {function:void} options.reduceAdd Reducer function which operates on a data point (returned by reduceInit) based on each new data point added to this group.
   * @param {function:void} options.reduceRemove Reducer function which operates on a data point (returned by reduceInit) based on each new data point removed from this group.
   * @param {?function:object[]} options.split Function which separates input data points into multiple data points before they get processed by the dimension.
   * @param {?function:string} options.seriesColor Function which returns a color for a series
   * @param {?function:string} options.dataColor Function which returns a color for a data point
   * @param {?function:object} options.defaultSeries Function which returns initial series object
   * @param {?string[]} options.selection Array of selection strings which the data will be filtered by
   * @param {?function:object} options.filterPredicate Function which returns a value from the object to check against the filters (defaults to the groupSeries function)
   * @param {?function:function} options.filterFactory Factory which creates a filter function to apply to each data point. Passed the selection, and the filterPredicate.
   */
  constructor (options = {}) {
    this.defaultSeries = Object.assign({}, options.defaultSeries ? options.defaultSeries() : { visible : true })

    this.rawData = []
    this.includedData = []
    this.excludedData = []
    this.data = []
    this.seriesHash = {}
    this.listeners = {}

    /* Options **********************************/
    this.id = options.id
    this.dimensionName = options.dimensionName || options.id

    // Should I include the data point in the set of data
    this.split = options.split || false

    // How to group and reduce data
    this.groupSeries = options.groupSeries || ((d) => d.category)
    this.groupData = options.groupData || ((d) => d.subcategory)
    if (!this.groupSeries) throw new Error('Must specify an options.groupSeries function to define what to use to group the data into series.')
    if (!this.groupData) throw new Error('Must specify an options.groupData function to define what makes each data point within a series unique.')
    
    this.reduceInit = options.reduceInit
    this.reduceAdd = options.reduceAdd
    this.reduceRemove = options.reduceRemove
    if (!this.reduceInit) throw new Error('Must specify an options.reduceInit function to initialize each new grouping for a data point')
    if (!this.reduceAdd) throw new Error('Must specify an options.reduceAdd function to define what happens when a new data point is added to a group')
    if (!this.reduceRemove) throw new Error('Must specify an reduceAdd function to define what happens when a new data point is removed from a group')

    // setup color reducers
    this.seriesColor = options.seriesColor || null
    this.dataColor = options.dataColor || null

    /* Filtering */
    this.selection = options.selection || []
    this.ownFilter = null
    this.appliedFilters = []

    /* What to compare the selection */
    this.filterPredicate = options.filterPredicate || this.groupSeries

    /* How to filter based on inputs (filterPredicate) and selection */
    this.filterFactory = options.filterFactory || FilterFactories.anySelectionMatchesValue

    // Post Processing...

    // Define a key to sortby (key on the chart data object, not raw data object)
    // OR define a custom sort function
    this.sortKey = options.sortKey || null
    this.sortFnc = options.sortFnc || null
    
    // Should empty data points (where all child data points have been filtered out) be shown?
    this.hideEmptyDataPoints = options.hideEmptyDataPoints === undefined ? true : options.hideEmptyDataPoints

    // Add custom post processing which will happen AFTER sort + hiding of default. Passed in default options.
    this.postProcess = options.postProcess || null
    
    // Initialise!
    this._updateOwnFilter()
    if (options.data) {
      let data = options.data
      this.addMany(data)
    }
  }

  /**
   * Add more than one data point to the dimension.
   *
   * @param {object[]} data An array of data to add to the dimension. Will have filters and reducers applied to each one.
   */
  addMany (data) {
    if (!Array.isArray(data)) throw new Error('Must pass in an array of data')

    data.forEach(function (d) {
      this._add(d)
    }.bind(this))

    this._postProcess()
  }

  /**
   * Add one data point to the dimension
   * @param {*} d A single data point (object) to add to the dimension. Will have filters and reducers applied to it.
   */
  addOne (d) {
    this._add(d)
    this._postProcess()
  }

  /**
   * Clear all series and reductions and reprocess the input data.
   */
  refresh () {
    const rawData = this.rawData

    this.data = []
    this.seriesHash = {}
    this.rawData = []
    this.includedData = []
    this.excludedData = []

    this.addMany(rawData)
  }

  /**
   * Returns the processed output data from this dimension.
   * React friendly for main data object, series and output data points.
   */
  getData () {
    return this.data.map(series => {
      return Object.assign({}, series, { dataPoints: series.dataPoints.map(d => d) })
    })
  }

  _compareSelection (newSelection) {
    if (newSelection.length !== this.selection.length) return false

    for (let i = 0; i < this.selection.length; i++) {
      if (!newSelection.includes(this.selection[i])) return false
    }

    return true
  }

  /**
   * Make a selection against this dimension. Will create a filter that gets applied to OTHER dimensions but
   * not this dimension.
   *
   * @param {string[]} newSelection
   */
  select (newSelection = []) {
    if (this._compareSelection(newSelection, this.selection)) return
    this.selection = newSelection
    this._updateOwnFilter()
  }

  /**
   * Clears the current selection applied to this dimension - therefor will clear any filters applied
   * to other dimensions by this dimension.
   */
  clearSelection () {
    this.select([])
  }

  /**
   * Returns the current selection applied to this dimension
   */
  getSelection () {
    return this.selection || null
  }

  /**
   * Returns the filter from this dimension to use on other dimensions
   */
  getFilter () {
    return this.ownFilter || null
  }

  _updateOwnFilter () {
    const selection = this.selection
    const predicate = this.filterPredicate
    const filterFactory = this.filterFactory

    this.ownFilter = {
      id: this.id,
      fnc: selection.length > 0 ? filterFactory(selection, predicate) : null
    }

    this._trigger('selection', this.ownFilter)
  }

  /**
   * Is this dimension currently filtered by other dimensions. Note that this will return true if a filter has been applied and then cleared.
   * @param {boolean} filter
   */
  hasFilter (filter) {
    return !!this.appliedFilters.find((f) => f.id === filter.id)
  }

  /**
   * Add a filter to this dimension from another dimension. Updates output data (getData)
   *
   * @param {string} filter.id The id of the dimension the filter belongs to
   * @param {function} filter.fnc The filter function filters the data based on that dimensions selected properties
   */
  addFilter (filter) {
    this._addFilter(filter)
    this._postProcess()
  }

  /**
   * Remove a filter to this dimension applied from another dimension. Updates output data (getData)
   *
   * @param {string} filter.id The id of the dimension the filter belongs to
   * @param {function} filter.fnc The filter function filters the data based on that dimensions selected properties
   */
  removeFilter (filter) {
    const filterToRemove = this.appliedFilters.find((f) => f.id === filter.id)
    if (filterToRemove) {
      this._removeFilter(filterToRemove)
      this._postProcess()
    }
  }

  /**
   * Replace a filter to this dimension applied from another dimension. Updates output data (getData)
   *
   * @param {string} filter.id The id of the dimension the filter belongs to
   * @param {function} filter.fnc The filter function filters the data based on that dimensions selected properties
   */
  replaceFilter (filter) {
    if (!filter.fnc) {
      return this.removeFilter(filter)
    }

    const filterToRemove = this.appliedFilters.find((f) => f.id === filter.id)
    if (filterToRemove) {
      this._removeFilter(filterToRemove)
    }

    this._addFilter(filter)
    this._postProcess()
  }
  /**
   * Clear all filters applied to this dimension.
   */
  clearFilters () {
    this.appliedFilters = []
    this._removeFilter(null)
    this._postProcess()
  }

  /**
   * Listen to valid events: "selection" | "change"
   *
   * @param {string} event Event to trigger callback on
   * @param {function} handler Callback function
   */
  on (event, handler) {
    if (!['selection', 'change'].includes(event)) {
      throw new Error('Unknown event type, only "selection" or "change" are valid')
    }

    let handlers = this.listeners[event]
    if (!handlers) {
      handlers = this.listeners[event] = []
    }

    handlers.push(handler)
  }

  /**
   * Remove an event handler
   *
   * @param {string} event Event type "selection" | "change"
   * @param {function} handler The callback that was registered with this event
   */
  off (event, handler) {
    let handlers = this.listeners[event]
    if (handlers) {
      let index = handlers.indexOf(handler)
      if (index !== -1) {
        handlers.splice(index, 1)
      }
    }
  }

  _trigger (event, arg) {
    let handlers = this.listeners[event]

    if (handlers) {
      handlers.forEach(function (handler) {
        handler(arg)
      })
    }
  }

  _add (d) {
    this.rawData.push(d)

    // Split the data if there is a split function
    if (this.split) {
      this.split(d).forEach(function (d) {
        this._checkFiltersOnAddition(d)
      }.bind(this))
    } else {
      this._checkFiltersOnAddition(d)
    }
  }

  _checkFiltersOnAddition (d) {
    // Filter any new points which do not match filters
    const filters = this.appliedFilters
    let is_included = true

    for (let i = 0; i < filters.length; i++) {
      let filter = filters[i]

      if (!filter.fnc(d)) {
        is_included = false
        break
      }
    }

    is_included ? this.includedData.push(d) : this.excludedData.push(d)

    if (is_included) this._processAddition(d)
  }

  _processAddition (d, exclude) {
    const series_name = this.groupSeries(d)
    let series = this.seriesHash[series_name]

    if (!series) {
      series = _.cloneDeep(this.defaultSeries)
      series.count = 0
      series.name = series_name
      series.dataHash = {}
      series.dataPoints = []

      if (this.seriesColor) {
        series.color = series.lineColor = this.seriesColor(series_name)
      }

      this.seriesHash[series_name] = series
      this.data.push(series)
    }

    let hash = this.groupData(d)
    let dataPoint = series.dataHash[hash]
    if (!dataPoint) {
      dataPoint = this.reduceInit(d)

      if (this.dataColor) {
        dataPoint.lineColor = dataPoint.markerColor = this.dataColor(d)
      }

      series.dataHash[hash] = dataPoint
      series.dataPoints.push(dataPoint)
    }

    series.count++
    if (series.count > 0) series.visible = true

    dataPoint.count++
    this.reduceAdd(dataPoint, d)
  }

  _processRemoval (d) {
    const series_name = this.groupSeries(d)
    let series = this.seriesHash[series_name]
    let group_name = this.groupData(d)
    let dataPoint = series.dataHash[group_name]
    let dataHash = series.dataHash

    dataPoint.count--
    if (dataPoint.count === 0 && this.hideEmptyDataPoints) {
      // Remove empty data points, will be removed from output array during post processing
      delete dataHash[group_name]
    } else {
      // Remove reduction of data point from aggregate data point
      this.reduceRemove(dataPoint, d)
    }

    series.count--
    if (series.count === 0) {
      series.visible = false
    }
  }

  _postProcess () {
    const { hideEmptyDataPoints, sortKey } = this
    const averageCount = _.meanBy(this.data, d => d.dataPoints.length)
    this.data.forEach(function (series) {
      if (hideEmptyDataPoints) {
        series.dataPoints = series.dataPoints.filter((d) => d.count > 0)
      }

      if (sortKey) {
        series.dataPoints = _.sortBy(series.dataPoints, sortKey)
      }
    })

    if (this.postProcess) {
      this.data = this.postProcess(this.data) || this.data
    }

    this._trigger('change')
  }

  _addFilter (filter) {
    this.appliedFilters.push(filter)

    const includedData = this.includedData
    const excludedData = this.excludedData
    const newIncludedData = []

    const filterFnc = filter.fnc
    includedData.forEach(function (d) {
      if (filterFnc(d)) {
        newIncludedData.push(d)
      } else {
        excludedData.push(d)
        this._processRemoval(d)
      }
    }.bind(this))

    this.includedData = newIncludedData
  }

  _removeFilter (filter) {
    const filters = this.appliedFilters

    // Remove filter from list of filters
    const index = filters.indexOf(filter)
    if (index !== -1) filters.splice(index, 1)

    const includedData = this.includedData
    const excludedData = this.excludedData
    const newExcludedData = []

    // Reprocess excluded data points
    excludedData.forEach(function (d) {
      let is_included = true

      for (let i = 0; i < filters.length; i++) {
        let filter = filters[i]
        if (!filter.fnc(d)) {
          is_included = false
          break
        }
      }

      is_included ? includedData.push(d) : newExcludedData.push(d)
      if (is_included) this._processAddition(d)
    }.bind(this))

    // Update the cached data which has been excluded from the data set due to filters
    this.excludedData = newExcludedData
  }
}

Dimension.Filters = FilterFactories

module.exports = Dimension
