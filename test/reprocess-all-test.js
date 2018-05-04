const { expect } = require('chai')
const _ = require('lodash')
const Dimension = require('../lib/dimension')
const DimensionManager = require('../lib/manager')

const data = require('./data')

describe('Filtering with reprocessAllOnFilter=true', function () {
  let dim, subgroupOneFilter

  before(function () {
    dim = new Dimension({
      id: 'dim',
      groupSeries: (d) => d.group,
      groupData: (d) => d.subgroup,
      reduceInit: (d) => ({ group: d.group, subgroup: d.subgroup, latest: d.timestamp, value: d.b }),
      reduceAdd: (out, d) => {
        if (d.timestamp > out.latest || out.latest === null) {
          out.latest = d.timestamp
          out.value = d.b
        }
      },
      reprocessAllOnFilter: true
    })

    dim.addMany(data)

    filterOne = { id: 'a:!3', fnc: d => d.a !== 3 }
  })

  it('should group values correctly', function () {
    expect(dim.findSeries('A').count).to.be.eq(9)
    expect(dim.findSeries('B').count).to.be.eq(3)
  })

  it('should reduce to latest correctly', function () {
    expect(dim.findDataPoint('A', 'one')).to.have.property('value').and.be.eq(3)
    expect(dim.findDataPoint('A', 'two')).to.have.property('value').and.be.eq(30)
    expect(dim.findDataPoint('A', 'three')).to.have.property('value').and.be.eq(300)
    expect(dim.findDataPoint('B', 'one')).to.have.property('value').and.be.eq(3000)
  })

  it('should reduce correctly when filter applied', function () {
    dim.addFilter(filterOne)

    expect(dim.excludedData).to.have.lengthOf(4)
    expect(dim.includedData).to.have.lengthOf(8)

    expect(dim.findDataPoint('A', 'one')).to.have.property('value').and.be.eq(2)
    expect(dim.findDataPoint('A', 'two')).to.have.property('value').and.be.eq(20)
    expect(dim.findDataPoint('A', 'three')).to.have.property('value').and.be.eq(200)
    expect(dim.findDataPoint('B', 'one')).to.have.property('value').and.be.eq(2000)
  })

  it('should remove a filter correctly, while reprocessing everything', function () {
    dim.removeFilter(filterOne)

    expect(dim.excludedData).to.have.lengthOf(0)
    expect(dim.includedData).to.have.lengthOf(12)

    expect(dim.findDataPoint('A', 'one')).to.have.property('value').and.be.eq(3)
    expect(dim.findDataPoint('A', 'two')).to.have.property('value').and.be.eq(30)
    expect(dim.findDataPoint('A', 'three')).to.have.property('value').and.be.eq(300)
    expect(dim.findDataPoint('B', 'one')).to.have.property('value').and.be.eq(3000)
  })
})

