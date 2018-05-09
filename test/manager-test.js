const { expect } = require('chai')
const _ = require('lodash')
const Dimension = require('../lib/dimension')
const DimensionManager = require('../lib/manager')

const data = require('./data')

const filterOne = { id: 'subgroup:!one', fnc: (d) => d.subgroup !== 'one' }
const filterTwo = { id: 'subgroup:!two', fnc: (d) => d.subgroup !== 'two' }

describe('Dimension Manager', function () {
  let dim1, dim2, manager

  before(function () {
    function postProcess (data) {
      data.forEach(series => {
        series.sumY = _.sumBy(series.dataPoints, 'y')
      })
    }

    dim1 = new Dimension({
      id: 'dim1',
      groupSeries: (d) => d.group,
      groupData: (d) => d.a,
      reduceInit: (d) => ({ x: d.a, y: 0, count: 0 }),
      reduceAdd: (out, d) => { out.y += d.b },
      reduceRemove: (out, d) => { out.y -= d.b },
      postProcess: postProcess
    })

    dim2 = new Dimension({
      id: 'dim2',
      groupSeries: (d) => d.subgroup,
      groupData: (d) => d.a,
      reduceInit: (d) => ({ x: d.a, y: 0, count: 0 }),
      reduceAdd: (out, d) => { out.y += d.b },
      reduceRemove: (out, d) => { out.y -= d.b },
      postProcess: postProcess
    })

    manager = new DimensionManager()
    manager.addDimension(dim1)
    manager.addDimension(dim2)

    manager.addData(data)
  })

  it('should group series correctly', function () {
    expect(dim1.data).to.have.lengthOf(2)
    expect(dim2.data).to.have.lengthOf(3)
  })

  it('should group values correctly', function () {
    expect(dim1.findSeries('A').dataPoints).to.have.lengthOf(3)
    expect(dim1.findSeries('B').dataPoints).to.have.lengthOf(3)

    expect(dim2.findSeries('one').dataPoints).to.have.lengthOf(3)
    expect(dim2.findSeries('two').dataPoints).to.have.lengthOf(3)
    expect(dim2.findSeries('three').dataPoints).to.have.lengthOf(3)
  })

  it('should reduce groups correctly', function () {
    expect(dim1.findSeries('A').dataPoints[0].y).to.be.eq(111)
    expect(dim1.findSeries('B').dataPoints[0].y).to.be.eq(1000)

    expect(dim2.findSeries('one').dataPoints[0].y).to.be.eq(1001)
    expect(dim2.findSeries('two').dataPoints[0].y).to.be.eq(10)
    expect(dim2.findSeries('three').dataPoints[0].y).to.be.eq(100)
  })

  it('adding selection to one dimension should affect the second dimension', function () {
    dim1.select('A')

    expect(dim1.excludedData).to.have.lengthOf(0)
    expect(dim1.includedData).to.have.lengthOf(12)

    expect(dim2.excludedData).to.have.lengthOf(3)
    expect(dim2.includedData).to.have.lengthOf(9)

    expect(dim2.findSeries('one').sumY).to.be.eq(6)
    expect(dim2.findSeries('two').sumY).to.be.eq(60)
    expect(dim2.findSeries('three').sumY).to.be.eq(600)
  })

  it('should clear the selection on a dimension correctly', function () {
    dim1.select()

    expect(dim1.excludedData).to.have.lengthOf(0)
    expect(dim1.includedData).to.have.lengthOf(12)

    expect(dim2.excludedData).to.have.lengthOf(0)
    expect(dim2.includedData).to.have.lengthOf(12)

    expect(dim2.findSeries('one').sumY).to.be.eq(6006)
    expect(dim2.findSeries('two').sumY).to.be.eq(60)
    expect(dim2.findSeries('three').sumY).to.be.eq(600)
  })

  it('should remove a dimension correctly', function () {
    manager.removeDimension(dim1)

    expect(manager.dimensions.length).to.be.eq(1)
  })

  it('should not be affected by changes to removed dimensions', function () {
    dim1.select('A')

    expect(dim2.excludedData).to.have.lengthOf(0)
    expect(dim2.includedData).to.have.lengthOf(12)

    expect(dim2.findSeries('one').sumY).to.be.eq(6006)
    expect(dim2.findSeries('two').sumY).to.be.eq(60)
    expect(dim2.findSeries('three').sumY).to.be.eq(600)
  })

  it('should not affect removed dimensions when selecting on included dimensions', function () {
    dim1.select()
    dim2.select('one')

    expect(dim1.excludedData).to.have.lengthOf(0)
    expect(dim1.includedData).to.have.lengthOf(12)
  })

  it('should emit output data when selection changes', function () {
    dim2.select()
    manager.addDimension(dim1)
    const check = function (data) {
      expect(_.values(data)).to.have.lengthOf(2)
      expect(data.dim1.data).to.have.lengthOf(2)
      expect(data.dim2.data).to.have.lengthOf(3)
      expect(data.dim1.data[0].dataPoints).to.have.lengthOf(3)
    }

    manager.on('change', check)
    dim2.select('two')
    manager.removeListener('change', check)
  })

  it('should emit a new object on selection change', function () {
    let object1, object2
    manager.addDimension(dim1)

    const check1 = function (data) {
      object1 = data
    }

    const check2 = function (data) {
      object2 = data
      expect(object2).to.not.eq(object1)
    }

    manager.on('change', check1)
    dim2.select()
    manager.removeListener('change', check1)

    manager.on('change', check2)
    dim2.select('two')
    manager.removeListener('change', check2)
  })
})
