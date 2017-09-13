class FSNode {
  get url () { return false }
  get type () { return 'node' }
  get name () { return '' }
  get size () { return 0 }
  get mtime () { return 0 }
  get isEditable () { return false }
  get isContainer () { return false } // is folder-like?
  get isEmpty () { return true }
  get hasChildren () { return !this.isEmpty }
  get children () { return [] }

  // load any data needed to display the node in the sidebar or in the expanded state
  async readData () {}

  // mutators
  async rename (newName) {}
  async delete () {}
}

class FSContainer extends FSNode {
  get type () { return 'container' }
  get isContainer () { return true }
}

module.exports = {FSNode, FSContainer}
