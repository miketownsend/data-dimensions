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

    expect(manager.handlers.length).to.be.eq(2)

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
    manager.removeDimension(dim1.id)

    expect(manager.dimensions.length).to.be.eq(1)
    expect(manager.handlers.length).to.be.eq(0)
  })

  it('should not be affected by changes to removed dimensions', function () {
    dim1.select('A')

    expect(manager.handlers.length).to.be.eq(0)

    expect(dim2.excludedData).to.have.lengthOf(0)
    expect(dim2.includedData).to.have.lengthOf(12)

    expect(dim2.findSeries('one').sumY).to.be.eq(6006)
    expect(dim2.findSeries('two').sumY).to.be.eq(60)
    expect(dim2.findSeries('three').sumY).to.be.eq(600)
  })

  it('should not affect removed dimensions when selecting on included dimensions', function () {
    dim1.select()
    dim2.select('one')

    expect(manager.handlers.length).to.be.eq(0)

    expect(dim1.excludedData).to.have.lengthOf(0)
    expect(dim1.includedData).to.have.lengthOf(12)
  })
})


describe('Full Filtering', function () {
  let dim

  before(function () {
    dim1 = new Dimension({
      id: 'dim1',
      groupSeries: (d) => d.group,
      groupData: (d) => d.subgroup,
      reduceInit: (d) => ({ group: d.group, subgroup: d.subgroup, latest: d.timestamp, value: d.b }),
      reduceAdd: (out, d) => {
        if (d.date > out.latest || out.latest === null) {
          out.latest = d.date
          out.value = d.b
        }
      },
      reprocessAllOnFilter: true
    })

    dim2 = new Dimension({
      id: 'dim2',
      groupSeries: (d) => d.a,
      groupData: () => null,
      reduceInit: (d) => ({ x: d.a, y: 0 }),
      reduceAdd: (out, d) => { out.y += d.b },
      reduceRemove: (out, d) => { out.y -= d.b }
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

  it('should add filter correctly', function () {
    dim.addFilter(filterOne)

    expect(dim.excludedData).to.have.lengthOf(9)
    expect(dim.includedData).to.have.lengthOf(9)
    expect(seriesA.dataPoints[0].y).to.be.eq(110)
    expect(seriesB.dataPoints).to.be.empty
    expect(seriesC.dataPoints[0].y).to.be.eq(100)
  })

  it('should hide series if all data points filtered out', function () {
    expect(seriesA.visible).to.be.eq(true)
    expect(seriesB.visible).to.be.eq(false)
  })

  it('should add a second filter correctly', function () {
    dim.addFilter(filterTwo)

    expect(dim.excludedData).to.have.lengthOf(12)
    expect(dim.includedData).to.have.lengthOf(6)
    expect(seriesA.dataPoints[0].y).to.be.eq(100)
    expect(seriesC.dataPoints[0].y).to.be.eq(100)
    expect(seriesB.dataPoints).to.be.empty
  })

  it('should remove a filter correctly', function () {
    dim.removeFilter(filterTwo)

    expect(dim.excludedData).to.have.lengthOf(9)
    expect(dim.includedData).to.have.lengthOf(9)
    expect(seriesA.dataPoints[0].y).to.be.eq(110)
    expect(seriesC.dataPoints[0].y).to.be.eq(100)
    expect(seriesB.dataPoints).to.have.lengthOf(0)
  })

  it('should remove all filters correctly', function () {
    dim.removeFilter(filterOne)

    expect(dim.excludedData).to.have.lengthOf(0)
    expect(dim.includedData).to.have.lengthOf(18)
    expect(seriesA.dataPoints[0].y).to.be.eq(111)
    expect(seriesB.dataPoints[0].y).to.be.eq(1000)
    expect(seriesC.dataPoints[0].y).to.be.eq(101)
  })

  it('should add a data point correctly while filters are in place', function () {
    dim.addFilter(filterOne)

    dim.addOne({ group: 'A', csvGroup: 'A,C', subgroup: 'one', a: 4, b: 4 })
    dim.addOne({ group: 'A', csvGroup: 'A', subgroup: 'two', a: 4, b: 40 })
    dim.addOne({ group: 'A', csvGroup: 'A,C', subgroup: 'three', a: 4, b: 400 })
    dim.addOne({ group: 'B', csvGroup: 'A', subgroup: 'one', a: 4, b: 4000 })

    expect(dim.excludedData).to.have.lengthOf(12)
    expect(dim.includedData).to.have.lengthOf(12)
    expect(seriesA.dataPoints[0].y).to.be.eq(110)
    expect(seriesC.dataPoints[0].y).to.be.eq(100)
    expect(seriesA.dataPoints[3].y).to.be.eq(440)
    expect(seriesC.dataPoints[3].y).to.be.eq(400)
    expect(seriesB.dataPoints).to.have.lengthOf(0)
  })
})

