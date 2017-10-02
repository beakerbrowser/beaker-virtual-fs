
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