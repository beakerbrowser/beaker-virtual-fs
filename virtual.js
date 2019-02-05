/* globals beaker */

const {FSNode, FSContainer} = require('./base')
const {diffUpdate, sortCompare} = require('./util')

class FSVirtualFolder extends FSContainer {
  constructor (parent, name) {
    super()
    this.parent = parent
    this._name = name
    this._children = []
  }

  get name () { return this._name }
  get type () { return 'folder' }
  get isEmpty () { return this._children.length === 0 }
  get children () { return this._children }

  async readData () {
    // fetch new children and update via diff
    var newChildren = await this.readChildren()
    this._children = diffUpdate(this._children, newChildren)
  }

  // should be overridden by subclass
  async readChildren () {
    return this._children
  }

  sort (column, dir) {
    this._children.forEach(child => child.sort(column, dir))
    this._children.sort((a, b) => {
      // by current setting
      return sortCompare(a, b, column, dir)
    })
  }
}

class FSVirtualItem extends FSNode {
  constructor (parent, name) {
    super()
    this.parent = parent
    this._name = name
  }

  get name () { return this._name }
}

module.exports = {
  FSVirtualFolder,
  FSVirtualItem
}
