
exports.diffUpdate = function (oldNodes, newNodes) {
  // write new data
  newNodes.forEach(newNode => {
    var oldNode = oldNodes.find(oldNode => oldNode.url === newNode.url)
    if (oldNode) {
      oldNode.copyDataFrom(newNode)
    } else {
      oldNodes.push(newNode)
    }
  })

  // remove old data
  oldNodes = oldNodes.filter(oldNode => {
    var newNode = newNodes.find(newNode => newNode.url === oldNode.url)
    return !!newNode
  })

  return oldNodes
}

exports.sortCompare = function (nodeA, nodeB, column, dir) {
  var res
  switch (column) {
    case 'updated':
      res = nodeA.mtime < nodeB.mtime ? 1 : -1
      break
    case 'size':
      if (nodeA.type !== 'folder' && nodeB.type !== 'folder') { // folders dont have sizes
        res = nodeA.size < nodeB.size ? 1 : -1
      }
      break
    case 'type':
      res = nodeA.type.localeCompare(nodeB.type)
      break
  }

  // fallback to alphabetical
  if (!res) {
    res = nodeA.name.localeCompare(nodeB.name)
  }

  // apply direction
  if (dir === 'asc') res *= -1
  return res
}