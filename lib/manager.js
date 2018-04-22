class DimensionManager {
  constructor () {
    this.data = []
    this.dimensions = []
    this.handlers = []
  }

  /**
   * Add a dimension to this set of managed dimensions. Will link each dimension together so that the selection
   * applied to one dimension will filter the other dimensions.
   * @param {Dimension} dimension
   */
  addDimension (dimension) {
    this.dimensions.forEach((otherDimension) => {
      this._removeEventHandler('selection', otherDimension, dimension)
      const handlerOtherObservesThis = (filter) => { otherDimension.replaceFilter(filter) }
      this._addEventHandler('selection', otherDimension, dimension, handlerOtherObservesThis)

      this._removeEventHandler('selection', dimension, otherDimension)
      const handlerThisObservesOther = (filter) => { dimension.replaceFilter(filter) }
      this._addEventHandler('selection', dimension, otherDimension, handlerThisObservesOther)
    })

    this.dimensions.push(dimension)
    dimension.addMany(this.data)
  }

  /**
   * Remove a dimension from the dimension manager. Will remove all event handlers to and from this dimension.
   *
   * @param {string} dimensionId The id of the dimension to remove
   */
  removeDimension (dimensionId) {
    const dimension = this.dimensions.find(dim => dim.id === dimensionId)
    const otherDimensions = this.dimensions.filter(dim => dim.id !== dimensionId)

    this.dimensions = otherDimensions
    otherDimensions.forEach((otherDimension) => {
      this._removeEventHandler('selection', dimension, otherDimension)
      this._removeEventHandler('selection', otherDimension, dimension)
    })
  }

  /**
   * Add data to each dimension managed by this DimensionManager
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
  }

  _addEventHandler (event, observer, target, handler) {
    target.on(event, handler)

    this.handlers.push({
      event: 'selection',
      observer: observer.id,
      target: target.id,
      fnc: handler
    })
  }

  _removeEventHandler (event, observer, target) {
    const handler = this.handlers.find((handler) => {
      return handler.event === event && handler.target === target.id && handler.observer === observer.id
    })

    if (!handler) return
    const index = this.handlers.indexOf(handler)
    this.handlers.splice(index, 1)
    target.off(event, handler.fnc)
  }
}

module.exports = DimensionManager
