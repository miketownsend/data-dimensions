const Dimension = require('./index')

const data = [
  { group: 'A', csvGroup: 'A,C', subgroup: 'one',   a: 1, b:    1 },
  { group: 'A', csvGroup: 'A,C', subgroup: 'one',   a: 2, b:    2 },
  { group: 'A', csvGroup: 'A,C', subgroup: 'one',   a: 3, b:    3 },
  { group: 'A', csvGroup: 'A',   subgroup: 'two',   a: 1, b:   10 },
  { group: 'A', csvGroup: 'A',   subgroup: 'two',   a: 2, b:   20 },
  { group: 'A', csvGroup: 'A',   subgroup: 'two',   a: 3, b:   30 },
  { group: 'A', csvGroup: 'A,C', subgroup: 'three', a: 1, b:  100 },
  { group: 'A', csvGroup: 'A,C', subgroup: 'three', a: 2, b:  200 },
  { group: 'A', csvGroup: 'A,C', subgroup: 'three', a: 3, b:  300 },
  { group: 'B', csvGroup: 'B',   subgroup: 'one',   a: 1, b: 1000 },
  { group: 'B', csvGroup: 'B',   subgroup: 'one',   a: 2, b: 2000 },
  { group: 'B', csvGroup: 'B',   subgroup: 'one',   a: 3, b: 3000 }
]

// Create a dimension
const dim = new Dimension({
  reduceInit: (d) => ({ x: d.a, y: 0, count: 0 }),
  reduceGroup: (d) => d.a,
  reduceSeries: (d) => d.group,
  reduceAdd: (out, d) => { out.y += d.b },
  reduceRemove: (out, d) => { out.y -= d.b }
})

dim.addMany(data)

console.log(JSON.stringify(dim.data, null, '  '))
