# CanvasJS Dimensions

Create crossfilter like dimensions compatible with [CanvasJS](https://canvasjs.com/).

## Features

- pretty fast (not [crossfilter](http://square.github.io/crossfilter/) fast)
- reduce into series for a line graph
- group within a series to aggregate data
- sort as part of post-processing
- define base series + datapoint options
- split input data
- lightweight (only dependency is lodash)

## Example

```js
// With dataset
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

// Add data
dim.addData(data)

// And consume the data series from the dimension
const chart = new CanvasJS.Chart('chartMain', {
  data: dim.data
})
chart.render()
```

The structure of the output data is:
```js
[
  {
    "name": "B",
    "dataPoints": [
      { "x": 1, "y": 1000, "count": 1 },
      { "x": 2, "y": 2000, "count": 1 },
      { "x": 3, "y": 3000, "count": 1 }
    ],
    "maxX": 3,
    "minX": 1,
    "maxY": 333,
    "minY": 111,
    "sumX": 6,
    "sumY": 666,
    "meanX": 2,
    "meanY": 222,
    "count": 9
  },
  {
    "name": "A",
    "dataPoints": [
      { "x": 1, "y": 111, "count": 3 },
      { "x": 2, "y": 222, "count": 3 },
      { "x": 3, "y": 333, "count": 3 }
    ],
    "maxX": 3,
    "minX": 1,
    "maxY": 333,
    "minY": 111,
    "sumX": 6,
    "sumY": 666,
    "meanX": 2,
    "meanY": 222,
    "count": 9
  },
]
```

# Dimension Options
Options that can be passed to the constructor

```
new Dimension(options)
```

### id: string (required)
A id for the dimension, should be unique)

### defaultSeries: object {{ type: 'line' }}
An object with the default series config required for CanvasJS. Will be copied onto every new series.

### dimensionName: string {defaults to id}
A friendly name for the dimension - only for reference

### hideEmptyDataPoints: boolean {false}
Whether to show datapoints which have been created, but filtered out.

### filterPredicate: function {(d) => d.category}
A function to get the property of each data point which the filter will be applied to.

### filterFactory: function {Dimension.Filters.anySelectionMatchesValue}
A factory which returns a filter. Passed the selection and the filterPredicate.

### reduce: string {'SUM'}
A helper function to use a default set of reduceAdd, reduceRemove and reduceInit. Options: `'MEAN' or 'SUM'`

### reduceSeries: function {(d) => d.category}
A predicate to select the value to separate the data into series.

### reduceGroup: function {(d) => d.subcategory}
A predicate to select the value to aggregate data within a series.

### reduceSeriesColor: function
A predicate to determine the color of a series. Passed the current series label.

### reduceColor: function
A function to determine the color of a series. Passed the current group dataPoint.

### selection: string[]
A string array which refers to which series are currently selected in this dimension. Creates a filter for this dimension can then be applied to other dimensions. Access this filter using `dim.getFilter()`

### split: function {(d) => [d1, d2]}
A function to split new data points on addition. Useful if you want to separate a comma separated property into two data points.

```js
// Example split group which will separate a data point in two based on
// a property called d.csvGroups
const split = (d) => {
  const groups = d.csvGroups ? d.csvGroups.split(',') : false
  if (groups) {
    return [Object.assign({}, d, { group: groups })]
  } else {
    return groups.map(s => Object.assign({}, d, { group: group.trim() }))
  }
}
```

### sortKey {required}
A key for lodash _.sortBy. The dataPoints array of each series will be sorted after each change in data (add, remove, filter).

# Dimension API

## Setup
### constructor (options)
See Dimension Options above

### addOne (d:object)
Adds a single input data point to the dimension. Runs it through the filters and does the post processing (sorting, totals, averages etc). Use addMany if there is more than one point to add at a time as it will only run the post-processing once.

### addMany (d:[object])
Adds an array of input data into the dimension. Runs it through the filters and does the post processing (sorting, totals, averages etc)

### refresh ()
Clears the cache and replays the input data through the dimensions reducers, filters and post processing.

## Getters

### getData ()
Returns the output data from this dimension. Not immutable so do not modify these data points.

## Selection
### compareSelection(newSelection:string[])
Checks whether the new selection is different to the old selection. Useful to limit re-processing of data if the selection has not changed.

### updateSelection (selection)
Sets the current selection for this dimension and creates a new filter that can be applied to other dimensions. Access the filter using `dim.getFilter()`.

### getSelection ()
Returns the current selection from this dimension.

### getFilter ()
Returns the filter for this dimension (or null if no filter exists). This filter can then be applied to other dimensions. Filter is built from current selection.

## Apply Filters
### hasFilter (filter)
Check whether a filter has already been applied to this dimension.

### addFilter (filter)
Apply a filter (from another dimension) to this dimension.

### removeFilter (filter)
Remove an applied filter

### replaceFilter (filter)
Replace an applied filter with an updated filter

### clearFilters ()
Remove all filters applied to this dimension

## Event Handling

### on (event:string, handler:function)
Add a listener to an event. Events:

- `"change"` the data has changed

### off (event:string, handler:function)
Remove a listener from an event.
