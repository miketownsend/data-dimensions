const { expect } = require('chai')
const Dimension = require('../lib/dimension')
const DimensionManager = require('../lib/manager')

const filterOne = { id: 'a', fnc: (d) => d.subgroup !== 'one' }
const filterTwo = { id: 'b', fnc: (d) => d.subgroup !== 'two' }

const data = [
  { group: 'A', csvGroup: 'A,C', subgroup: 'one', a: 1, b:    1 },
  { group: 'A', csvGroup: 'A,C', subgroup: 'one', a: 2, b:    2 },
  { group: 'A', csvGroup: 'A,C', subgroup: 'one', a: 3, b:    3 },
  { group: 'A', csvGroup: 'A', subgroup: 'two', a: 1, b:   10 },
  { group: 'A', csvGroup: 'A', subgroup: 'two', a: 2, b:   20 },
  { group: 'A', csvGroup: 'A', subgroup: 'two', a: 3, b:   30 },
  { group: 'A', csvGroup: 'A,C', subgroup: 'three', a: 1, b:  100 },
  { group: 'A', csvGroup: 'A,C', subgroup: 'three', a: 2, b:  200 },
  { group: 'A', csvGroup: 'A,C', subgroup: 'three', a: 3, b:  300 },
  { group: 'B', csvGroup: 'B', subgroup: 'one', a: 1, b: 1000 },
  { group: 'B', csvGroup: 'B', subgroup: 'one', a: 2, b: 2000 },
  { group: 'B', csvGroup: 'B', subgroup: 'one', a: 3, b: 3000 }
]

describe('Dimension Manager', function () {
  let dim1, dim2, manager, dim1seriesA, dim1seriesB, dim2seriesOne, dim2seriesTwo, dim2seriesThree

  before(function () {
    dim1 = new Dimension({
      id: 'dim1',
      groupSeries: (d) => d.group,
      groupData: (d) => d.a,
      reduceInit: (d) => ({ x: d.a, y: 0, count: 0 }),
      reduceAdd: (out, d) => { out.y += d.b },
      reduceRemove: (out, d) => { out.y -= d.b }
    })

    dim2 = new Dimension({
      id: 'dim2',
      groupSeries: (d) => d.subgroup,
      groupData: (d) => d.a,
      reduceInit: (d) => ({ x: d.a, y: 0, count: 0 }),
      reduceAdd: (out, d) => { out.y += d.b },
      reduceRemove: (out, d) => { out.y -= d.b }
    })

    manager = new DimensionManager()
    manager.addDimension(dim1)
    manager.addDimension(dim2)

    manager.addData(data)

    dim1seriesA = dim1.data.find((series) => series.name === 'A')
    dim1seriesB = dim1.data.find((series) => series.name === 'B')

    dim2seriesOne = dim2.data.find((series) => series.name === 'one')
    dim2seriesTwo = dim2.data.find((series) => series.name === 'two')
    dim2seriesThree = dim2.data.find((series) => series.name === 'three')
  })

  it('should group series correctly', function () {
    expect(dim1.data).to.have.lengthOf(2)
    expect(dim2.data).to.have.lengthOf(3)
  })

  it('should group values correctly', function () {
    expect(dim1seriesA.dataPoints).to.have.lengthOf(3)
    expect(dim1seriesB.dataPoints).to.have.lengthOf(3)

    expect(dim2seriesOne.dataPoints).to.have.lengthOf(3)
    expect(dim2seriesTwo.dataPoints).to.have.lengthOf(3)
    expect(dim2seriesThree.dataPoints).to.have.lengthOf(3)
  })

  it('should reduce groups correctly', function () {
    expect(dim1seriesA.dataPoints[0].y).to.be.eq(111)
    expect(dim1seriesB.dataPoints[0].y).to.be.eq(1000)

    expect(dim2seriesOne.dataPoints[0].y).to.be.eq(1001)
    expect(dim2seriesTwo.dataPoints[0].y).to.be.eq(10)
    expect(dim2seriesThree.dataPoints[0].y).to.be.eq(100)
  })

  it('adding selection to one dimension should affect the second dimension', function () {
    dim1.select('A')

    expect(manager.handlers.length).to.be.eq(2)

    expect(dim1.excludedData).to.have.lengthOf(0)
    expect(dim1.includedData).to.have.lengthOf(12)

    expect(dim2.excludedData).to.have.lengthOf(3)
    expect(dim2.includedData).to.have.lengthOf(9)

    expect(dim2seriesOne.sumY).to.be.eq(6)
    expect(dim2seriesTwo.sumY).to.be.eq(60)
    expect(dim2seriesThree.sumY).to.be.eq(600)
  })

  it('should clear the selection on a dimension correctly', function () {
    dim1.select()

    expect(dim1.excludedData).to.have.lengthOf(0)
    expect(dim1.includedData).to.have.lengthOf(12)

    expect(dim2.excludedData).to.have.lengthOf(0)
    expect(dim2.includedData).to.have.lengthOf(12)

    expect(dim2seriesOne.sumY).to.be.eq(6006)
    expect(dim2seriesTwo.sumY).to.be.eq(60)
    expect(dim2seriesThree.sumY).to.be.eq(600)
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

    expect(dim2seriesOne.sumY).to.be.eq(6006)
    expect(dim2seriesTwo.sumY).to.be.eq(60)
    expect(dim2seriesThree.sumY).to.be.eq(600)
  })

  it('should not affected removed dimensions when selecting on included dimensions', function () {
    dim1.select()
    dim2.select('one')

    expect(manager.handlers.length).to.be.eq(0)

    expect(dim1.excludedData).to.have.lengthOf(0)
    expect(dim1.includedData).to.have.lengthOf(12)
  })
})

