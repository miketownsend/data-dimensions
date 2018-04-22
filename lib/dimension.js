const _ = require('lodash')
const FilterFactories = require('./filters')

const REDUCERS = {
  SUM: 'SUM',
  MEAN: 'MEAN'
}

class Dimension {
  constructor (options = {}) {
    this.defaultSeries = Object.assign({
      visible : true,
      maxX: 0,
      minX: 0,
      maxY: 0,
      minY: 0,
      sumX: 0,
      sumY: 0,
      meanX: 0,
      meanY: 0
    }, options.defaultSeries)

    this.rawData = []
    this.includedData = []
    this.excludedData = []
    this.data = []
    this.seriesHash = {}
    this.listeners = {}

    /* Options **********************************/
    this.id = options.id
    this.dimensionName = options.dimensionName || options.id

    // Define behavior for data points which have been filtered out
    this.hideEmptyDataPoints = options.hideEmptyDataPoints === undefined ? true : options.hideEmptyDataPoints

    // Should I include the data point in the set of data
    this.split = options.split || false

    // How to group and reduce data
    this.groupSeries = options.groupSeries || ((d) => d.category)
    this.groupData = options.groupData || ((d) => d.subcategory)

    this.reduceInit = options.reduceInit
    this.reduceAdd = options.reduceAdd
    this.reduceRemove = options.reduceRemove

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

    // define a key to sortby (key on the chart data object, not raw data object)
    // OR define a custom sort function
    this.sortKey = options.sortKey || null
    this.sortFnc = options.sortFnc || null

    this._validateOptions()
    this._updateOwnFilter()

    if (options.data) {
      let data = options.data
      this.addMany(data)
    }
  }

  _validateOptions () {
    if (!this.id) throw new Error('Must specify an id for the dimension')
    if (!this.groupSeries) throw new Error('Must specify an options.groupSeries function to define what to use to group the data into series.')
    if (!this.groupData) throw new Error('Must specify an options.groupData function to define what makes each data point within a series unique.')
    if (!this.reduceInit) throw new Error('Must specify an options.reduceInit function to initialize each new grouping for a data point')
    if (!this.reduceAdd) throw new Error('Must specify an options.reduceAdd function to define what happens when a new data point is added to a group')
    if (!this.reduceRemove) throw new Error('Must specify an reduceAdd function to define what happens when a new data point is removed from a group')
  }

  addMany (data) {
    data.forEach(function (d) {
      this._add(d)
    }.bind(this))

    this._postProcess()
  }

  addOne (d) {
    this._add(d)
    this._postProcess()
  }

  refresh () {
    const rawData = this.rawData

    this.data = []
    this.seriesHash = {}
    this.rawData = []
    this.includedData = []
    this.excludedData = []

    this.addMany(rawData)
  }

  getData () {
    return this.data
  }

  compareSelection (newSelection) {
    if (newSelection.length !== this.selection.length) return false

    for (let i = 0; i < this.selection.length; i++) {
      if (!newSelection.includes(this.selection[i])) return false
    }

    return true
  }

  select (newSelection = []) {
    if (this.compareSelection(newSelection, this.selection)) return
    this.selection = newSelection
    this._updateOwnFilter()
  }

  clearSelection () {
    this.select([])
  }

  getSelection () {
    return this.selection || null
  }

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

  hasFilter (filter) {
    return !!this.appliedFilters.find((f) => f.id === filter.id)
  }

  addFilter (filter) {
    this._addFilter(filter)
    this._postProcess()
  }

  removeFilter (filter) {
    const filterToRemove = this.appliedFilters.find((f) => f.id === filter.id)
    if (filterToRemove) {
      this._removeFilter(filterToRemove)
      this._postProcess()
    }
  }

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

  clearFilters () {
    this.appliedFilters = []
    this._removeFilter(null)
    this._postProcess()
  }

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

      if (series.dataPoints.length > 0) {
        series.maxX = _.maxBy(series.dataPoints, (d) => d.x).x
        series.minX = _.minBy(series.dataPoints, (d) => d.x).x
        series.maxY = _.maxBy(series.dataPoints, (d) => d.y).y
        series.minY = _.minBy(series.dataPoints, (d) => d.y).y
        series.sumX = _.sumBy(series.dataPoints, (d) => d.x)
        series.sumY = _.sumBy(series.dataPoints, (d) => d.y)
        series.meanX = _.meanBy(series.dataPoints, (d) => d.x)
        series.meanY = _.meanBy(series.dataPoints, (d) => d.y)
      }

      if (sortKey) {
        series.dataPoints = _.sortBy(series.dataPoints, sortKey)
      }
    })

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

Dimension.REDUCERS = REDUCERS
Dimension.Filters = FilterFactories

module.exports = Dimension
