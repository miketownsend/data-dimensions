const { expect } = require('chai')
const Dimension = require('../lib/dimension')

const data = require('./data')

const filterOne = { id: 'subgroup:!one', fnc: (d) => d.subgroup !== 'one' }
const filterTwo = { id: 'subgroup:!two', fnc: (d) => d.subgroup !== 'two' }

describe('Aggregation and Filtering', function () {
  this.timeout(240000)

  let dim, seriesA, seriesB

  before(function () {
    dim = new Dimension({
      id: 'dim1',
      verbose: false,
      groupSeries: (d) => d.group,
      groupData: (d) => d.a,
      reduceInit: (d) => ({ x: d.a, y: 0 }),
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
    expect(dim.findSeries('A').dataPoints).to.have.lengthOf(3)
    expect(dim.findSeries('A').count).to.be.eq(9)
    expect(dim.findSeries('B').dataPoints).to.have.lengthOf(3)
    expect(dim.findSeries('B').count).to.be.eq(3)
  })

  it('should reduce groups correctly', function () {
    expect(dim.findSeries('A').dataPoints[0].y).to.be.eq(111)
    expect(dim.findSeries('A').dataPoints[0].count).to.be.eq(3)
    expect(dim.findSeries('B').dataPoints[0].y).to.be.eq(1000)
    expect(dim.findSeries('B').dataPoints[0].count).to.be.eq(1)
  })

  it('should add filter correctly', function () {
    dim.addFilter(filterOne)

    expect(dim.excludedData).to.have.lengthOf(6)
    expect(dim.includedData).to.have.lengthOf(6)
    expect(dim.findSeries('A').dataPoints[0].y).to.be.eq(110)
    expect(dim.findSeries('A').count).to.be.eq(6)
    expect(dim.findSeries('B').dataPoints).to.be.empty
    expect(dim.findSeries('B').count).to.be.eq(0)
  })

  it('should add a second filter correctly', function () {
    dim.addFilter(filterTwo)

    expect(dim.excludedData).to.have.lengthOf(9)
    expect(dim.includedData).to.have.lengthOf(3)
    expect(dim.findSeries('A').dataPoints[0].y).to.be.eq(100)
    expect(dim.findSeries('B').dataPoints).to.be.empty
  })

  it('should remove a filter correctly', function () {
    dim.removeFilter(filterTwo)

    expect(dim.excludedData).to.have.lengthOf(6)
    expect(dim.includedData).to.have.lengthOf(6)
    expect(dim.findSeries('A').dataPoints).to.have.lengthOf(3)
    expect(dim.findSeries('A').dataPoints[0].y).to.be.eq(110)
    // expect(dim.findSeries('A').count).to.be.eq(6)
    expect(dim.findSeries('B').dataPoints).to.have.lengthOf(0)
    // expect(dim.findSeries('B').count).to.be.eq(0)
  })

  it('should remove all filters correctly', function () {
    dim.removeFilter(filterOne)

    expect(dim.excludedData).to.have.lengthOf(0)
    expect(dim.includedData).to.have.lengthOf(12)

    expect(dim.findSeries('A').dataPoints).to.have.lengthOf(3)
    expect(dim.findSeries('A').dataPoints[0].y).to.be.eq(111)
    expect(dim.findSeries('B').dataPoints).to.have.lengthOf(3)
    expect(dim.findSeries('B').dataPoints[0].y).to.be.eq(1000)
  })

  it('should add a data point correctly while filters are in place', function () {
    dim.addFilter(filterOne)

    dim.addMany([
      { group: 'A', subgroup: 'one', a: 4, b: 4 },
      { group: 'A', subgroup: 'two', a: 4, b: 40 },
      { group: 'A', subgroup: 'three', a: 4, b: 400 },
      { group: 'B', subgroup: 'one', a: 4, b: 4000 }
    ])

    const seriesA = dim.findSeries('A')
    expect(dim.excludedData).to.have.lengthOf(8)
    expect(dim.includedData).to.have.lengthOf(8)

    expect(seriesA.dataPoints).to.have.lengthOf(4)
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
      reduceInit: (d) => ({ x: d.a, y: 0 }),
      reduceAdd: (out, d) => { out.y += d.b },
      reduceRemove: (out, d) => { out.y -= d.b }
    })

    dim.addMany(data)
  })

  it('should group series correctly', function () {
    expect(dim.data).to.have.lengthOf(3)
  })

  it('should group values correctly', function () {
    expect(dim.findSeries('A').dataPoints).to.have.lengthOf(3)
    expect(dim.findSeries('B').dataPoints).to.have.lengthOf(3)
    expect(dim.findSeries('C').dataPoints).to.have.lengthOf(3)
  })

  it('should reduce groups correctly', function () {
    expect(dim.findSeries('A').dataPoints[0].y).to.be.eq(111)
    expect(dim.findSeries('B').dataPoints[0].y).to.be.eq(1000)
    expect(dim.findSeries('C').dataPoints[0].y).to.be.eq(101)
  })

  it('should add filter correctly', function () {
    dim.addFilter(filterOne)

    expect(dim.excludedData).to.have.lengthOf(9)
    expect(dim.includedData).to.have.lengthOf(9)
    expect(dim.findSeries('A').dataPoints[0].y).to.be.eq(110)
    expect(dim.findSeries('B').dataPoints).to.be.empty
    expect(dim.findSeries('C').dataPoints[0].y).to.be.eq(100)
  })

  it('should hide series if all data points filtered out', function () {
    expect(dim.findSeries('A').visible).to.be.eq(true)
    expect(dim.findSeries('B').visible).to.be.eq(false)
  })

  it('should add a second filter correctly', function () {
    dim.addFilter(filterTwo)

    expect(dim.excludedData).to.have.lengthOf(12)
    expect(dim.includedData).to.have.lengthOf(6)
    expect(dim.findSeries('A').dataPoints[0].y).to.be.eq(100)
    expect(dim.findSeries('C').dataPoints[0].y).to.be.eq(100)
    expect(dim.findSeries('B').dataPoints).to.be.empty
  })

  it('should remove a filter correctly', function () {
    dim.removeFilter(filterTwo)

    expect(dim.excludedData).to.have.lengthOf(9)
    expect(dim.includedData).to.have.lengthOf(9)
    expect(dim.findSeries('A').dataPoints[0].y).to.be.eq(110)
    expect(dim.findSeries('C').dataPoints[0].y).to.be.eq(100)
    expect(dim.findSeries('B').dataPoints).to.have.lengthOf(0)
  })

  it('should remove all filters correctly', function () {
    dim.removeFilter(filterOne)

    expect(dim.excludedData).to.have.lengthOf(0)
    expect(dim.includedData).to.have.lengthOf(18)
    expect(dim.findSeries('A').dataPoints[0].y).to.be.eq(111)
    expect(dim.findSeries('B').dataPoints[0].y).to.be.eq(1000)
    expect(dim.findSeries('C').dataPoints[0].y).to.be.eq(101)
  })

  it('should add a data point correctly while filters are in place', function () {
    dim.addFilter(filterOne)

    dim.addOne({ group: 'A', csvGroup: 'A,C', subgroup: 'one', a: 4, b: 4 })
    dim.addOne({ group: 'A', csvGroup: 'A', subgroup: 'two', a: 4, b: 40 })
    dim.addOne({ group: 'A', csvGroup: 'A,C', subgroup: 'three', a: 4, b: 400 })
    dim.addOne({ group: 'B', csvGroup: 'A', subgroup: 'one', a: 4, b: 4000 })

    expect(dim.excludedData).to.have.lengthOf(12)
    expect(dim.includedData).to.have.lengthOf(12)
    expect(dim.findSeries('A').dataPoints[0].y).to.be.eq(110)
    expect(dim.findSeries('C').dataPoints[0].y).to.be.eq(100)
    expect(dim.findSeries('A').dataPoints[3].y).to.be.eq(440)
    expect(dim.findSeries('C').dataPoints[3].y).to.be.eq(400)
    expect(dim.findSeries('B').dataPoints).to.have.lengthOf(0)
  })
})
