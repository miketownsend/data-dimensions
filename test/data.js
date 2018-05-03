const parse = require('date-fns/parse')

const data = [
  { group: 'A', csvGroup: 'A,C', subgroup: 'one', a: 1, b: 1, timestamp: '2018-01-01T00:01:01.000Z' },
  { group: 'A', csvGroup: 'A,C', subgroup: 'one', a: 2, b: 2, timestamp: '2018-01-01T00:01:02.000Z' },
  { group: 'A', csvGroup: 'A,C', subgroup: 'one', a: 3, b: 3, timestamp: '2018-01-01T00:01:03.000Z' },
  { group: 'A', csvGroup: 'A', subgroup: 'two', a: 1, b: 10, timestamp: '2018-01-01T00:01:04.000Z' },
  { group: 'A', csvGroup: 'A', subgroup: 'two', a: 2, b: 20, timestamp: '2018-01-01T00:01:05.000Z' },
  { group: 'A', csvGroup: 'A', subgroup: 'two', a: 3, b: 30, timestamp: '2018-01-01T00:01:06.000Z' },
  { group: 'A', csvGroup: 'A,C', subgroup: 'three', a: 1, b: 100, timestamp: '2018-01-01T00:01:07.000Z' },
  { group: 'A', csvGroup: 'A,C', subgroup: 'three', a: 2, b: 200, timestamp: '2018-01-01T00:01:08.000Z' },
  { group: 'A', csvGroup: 'A,C', subgroup: 'three', a: 3, b: 300, timestamp: '2018-01-01T00:01:09.000Z' },
  { group: 'B', csvGroup: 'B', subgroup: 'one', a: 1, b: 1000, timestamp: '2018-01-01T00:01:10.000Z' },
  { group: 'B', csvGroup: 'B', subgroup: 'one', a: 2, b: 2000, timestamp: '2018-01-01T00:01:11.000Z' },
  { group: 'B', csvGroup: 'B', subgroup: 'one', a: 3, b: 3000, timestamp: '2018-01-01T00:01:12.000Z' }
];

module.exports = data.map(d => Object.assign({}, d, { timestamp: parse(d.timestamp) }));
