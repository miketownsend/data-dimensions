const { Dimension, DimensionManager } = require('./index')

const data = [
  { group: 'A', subgroup: 'one',   a: 1, b:    1 },
  { group: 'A', subgroup: 'one',   a: 2, b:    2 },
  { group: 'A', subgroup: 'one',   a: 3, b:    3 },
  { group: 'A', subgroup: 'two',   a: 1, b:   10 },
  { group: 'A', subgroup: 'two',   a: 2, b:   20 },
  { group: 'A', subgroup: 'two',   a: 3, b:   30 },
  { group: 'A', subgroup: 'three', a: 1, b:  100 },
  { group: 'A', subgroup: 'three', a: 2, b:  200 },
  { group: 'A', subgroup: 'three', a: 3, b:  300 },
  { group: 'B', subgroup: 'one',   a: 1, b: 1000 },
  { group: 'B', subgroup: 'one',   a: 2, b: 2000 },
  { group: 'B', subgroup: 'one',   a: 3, b: 3000 }
]

// Create a dimension
const dim1 = new Dimension({
  id: 'dim1',
  groupSeries: (d) => d.group,
  groupData: (d) => d.a,
  reduceInit: (d) => ({ x: d.a, y: 0, count: 0 }),
  reduceAdd: (out, d) => { out.y += d.b },
  reduceRemove: (out, d) => { out.y -= d.b }
})

const dim2 = new Dimension({
  id: 'dim2',
  groupSeries: (d) => d.subgroup,
  groupData: (d) => d.a,
  reduceInit: (d) => ({ x: d.a, y: 0, count: 0 }),
  reduceAdd: (out, d) => { out.y += d.b },
  reduceRemove: (out, d) => { out.y -= d.b }
})

const dimensions = new DimensionManager()
dimensions.addDimension(dim1)
dimensions.addDimension(dim2)
dimensions.addData(data)

dim1.select('A')

console.log(dim2.getData())
