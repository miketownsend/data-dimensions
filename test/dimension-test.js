const { expect } = require('chai')
const Dimension = require('../lib/dimension')

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

describe('Aggregation and Filtering', function () {
  let dim, seriesA, seriesB

  before(function () {
    dim = new Dimension({
      id: 'dim1',
      groupSeries: (d) => d.group,
      groupData: (d) => d.a,
      reduceInit: (d) => ({ x: d.a, y: 0, count: 0 }),
      reduceAdd: (out, d) => { out.y += d.b },
      reduceRemove: (out, d) => { out.y -= d.b }
    })

    dim.addMany(data)

    seriesA = dim.data.find((series) => series.name === 'A')
    seriesB = dim.data.find((series) => series.name === 'B')
  })

  it('should group series correctly', function () {
    expect(dim.data).to.have.lengthOf(2)
  })

  it('should group values correctly', function () {
    expect(seriesA.dataPoints).to.have.lengthOf(3)
    expect(seriesB.dataPoints).to.have.lengthOf(3)
  })

  it('should reduce groups correctly', function () {
    expect(seriesA.dataPoints[0].y).to.be.eq(111)
    expect(seriesB.dataPoints[0].y).to.be.eq(1000)
  })

  it('should add filter correctly', function () {
    dim.addFilter(filterOne)

    expect(dim.excludedData).to.have.lengthOf(6)
    expect(dim.includedData).to.have.lengthOf(6)
    expect(seriesA.dataPoints[0].y).to.be.eq(110)
    expect(seriesB.dataPoints).to.be.empty
  })

  it('should hide series if all data points filtered out', function () {
    expect(seriesA.visible).to.be.eq(true)
    expect(seriesB.visible).to.be.eq(false)
  })

  it('should add a second filter correctly', function () {
    dim.addFilter(filterTwo)

    expect(dim.excludedData).to.have.lengthOf(9)
    expect(dim.includedData).to.have.lengthOf(3)
    expect(seriesA.dataPoints[0].y).to.be.eq(100)
    expect(seriesB.dataPoints).to.be.empty
  })

  it('should remove a filter correctly', function () {
    dim.removeFilter(filterTwo)

    expect(dim.excludedData).to.have.lengthOf(6)
    expect(dim.includedData).to.have.lengthOf(6)
    expect(seriesA.dataPoints[0].y).to.be.eq(110)
    expect(seriesB.dataPoints).to.have.lengthOf(0)
  })

  it('should remove all filters correctly', function () {
    dim.removeFilter(filterOne)
    expect(dim.excludedData).to.have.lengthOf(0)
    expect(dim.includedData).to.have.lengthOf(12)
    expect(seriesA.dataPoints[0].y).to.be.eq(111)
    expect(seriesB.dataPoints[0].y).to.be.eq(1000)
  })

  it('should add a data point correctly while filters are in place', function () {
    dim.addFilter(filterOne)

    dim.addOne({ group: 'A', subgroup: 'one', a: 4, b: 4 })
    dim.addOne({ group: 'A', subgroup: 'two', a: 4, b: 40 })
    dim.addOne({ group: 'A', subgroup: 'three', a: 4, b: 400 })
    dim.addOne({ group: 'B', subgroup: 'one', a: 4, b: 4000 })

    expect(dim.excludedData).to.have.lengthOf(8)
    expect(dim.includedData).to.have.lengthOf(8)
    expect(seriesA.dataPoints[0].y).to.be.eq(110)
    expect(seriesA.dataPoints[3].y).to.be.eq(440)
    expect(seriesB.dataPoints).to.have.lengthOf(0)
  })
})

describe('Splitting', function () {
  let dim, seriesA, seriesB, seriesC

  before(function () {
    dim = new Dimension({
      id: 'dim',
      split: (d) => {
        let csvGroups = d.csvGroup.split(',').map(s => s.trim())
        let out = csvGroups.map(s => Object.assign({}, d, { csvGroup: s }))
        return out
      },
      groupSeries: (d) => d.csvGroup,
      groupData: (d) => d.a,
      reduceInit: (d) => ({ x: d.a, y: 0, count: 0 }),
      reduceAdd: (out, d) => { out.y += d.b },
      reduceRemove: (out, d) => { out.y -= d.b }
    })

    dim.addMany(data)

    seriesA = dim.data.find((series) => series.name === 'A')
    seriesB = dim.data.find((series) => series.name === 'B')
    seriesC = dim.data.find((series) => series.name === 'C')
  })

  it('should group series correctly', function () {
    expect(dim.data).to.have.lengthOf(3)
  })

  it('should group values correctly', function () {
    expect(seriesA.dataPoints).to.have.lengthOf(3)
    expect(seriesB.dataPoints).to.have.lengthOf(3)
    expect(seriesC.dataPoints).to.have.lengthOf(3)
  })

  it('should reduce groups correctly', function () {
    expect(seriesA.dataPoints[0].y).to.be.eq(111)
    expect(seriesB.dataPoints[0].y).to.be.eq(1000)
    expect(seriesC.dataPoints[0].y).to.be.eq(101)
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

