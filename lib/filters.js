function anySelectionMatchesValue (selection, predicate) {
  return (d) => {
    return selection.includes(predicate(d))
  }
}

function anySelectionInValueArray (selection, predicate) {
  return (d) => {
    const valuesArray = predicate(d)

    for (let i = 0; i < selection.length; i++) {
      if (valuesArray.includes(selection[i])) {
        return true
      }
    }

    return false
  }
}

module.exports = {
  anySelectionInValueArray,
  anySelectionMatchesValue
}
