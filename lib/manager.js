const EventEmitter = require('events')

class DimensionManager extends EventEmitter {
  constructor (options) {
    super(options)
    this.data = []
    this.dimensions = []
    this.selectionHandler = this._onSelectionChange.bind(this)
  }

  /**
   * Gets a dimesion by id
   */
  getDimension (id) {
    return this.dimensions.find(dim => dim.id === id)
  }

  /**
   * Get all dimensions in a new object
   */
  getData () {
    return this.dimensions.reduce((out, dim) => {
      out[dim.id] = {
        id: dim.id,
        name: dim.name,
        selection: dim.selection,
        data: dim.data
      }

      return out;
    }, {})
  }

  /**
   * Add a dimension to this set of managed dimensions. Will link each dimension together so that the selection
   * applied to one dimension will filter the other dimensions.
   * @param {Dimension} dimension
   */
  addDimension (dimension) {
    dimension.on('selection', this.selectionHandler)
    this.dimensions.push(dimension)
    dimension.addMany(this.data)
  }

  /**
   * Add data to each dimension managed by this DimensionManager
   * Fires one change event for the whole add operation.
   * @param {object[]|object} data
   */
  addData (data) {
    if (Array.isArray(data)) {
      this.dimensions.forEach(dim => dim.addMany(data))
      this.data = this.data.concat(data)
    } else {
      this.dimensions.forEach(dim => dim.addOne(data))
      this.data.push(data)
    }

    this.emit('change', this.getData())
  }

  /**
   * Remove a dimension from the dimension manager. Will remove all event handlers to and from this dimension.
   * @param {string|Dimension} dimension The dimension, or dimension id of the dimension to remove
   */
  removeDimension (dimension) {
    if (typeof dimension === 'string') {
      dimension = this.dimensions.find(dim => dim.id === dimension)
    }

    this.dimensions = this.dimensions.filter(dim => dim.id !== dimension.id)
    dimension.removeListener('selection', this.selectionHandler)
  }

  // Handle a change in selection in one dimension by applying filters to the other dimensions.
  _onSelectionChange (filter) {
    const dimensionsToFilter = this.dimensions.filter(dim => dim.id !== filter.id)

    dimensionsToFilter.forEach(dim => {
      dim.replaceFilter(filter)
    })

    this.emit('change', this.getData())
  }
}

module.exports = DimensionManager
