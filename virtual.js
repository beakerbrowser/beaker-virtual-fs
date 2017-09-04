/* globals beaker */

const {FSContainer} = require('./base')
const {FSArchive} = require('./archive')

class FSVirtualRoot extends FSContainer {
  constructor () {
    super()
    this._children = [
      new FSVirtualFolder_Library(),
      new FSVirtualFolder_Friends(),
      new FSVirtualFolder_Trash()
    ]
  }

  get type () { return 'root' }
  get name () { return 'Home' }
  get isEmpty () { return false }
  get children () { return this._children }
}

class FSVirtualFolder_Library extends FSContainer {
  constructor () {
    super()
    this._userArchives = []
  }

  get name () { return 'Library' }
  get isEmpty () { return this._userArchives.length === 0 }
  get children () { return this._userArchives }

  async readData () {
    const userArchives = await beaker.archives.list({isSaved: true, isOwner: true})
    this._userArchives = userArchives.map(a => new FSArchive(a))
  }

}

class FSVirtualFolder_Friends extends FSContainer {
  get name () { return 'Friends' }

  // TODO
}

class FSVirtualFolder_Trash extends FSContainer {
  constructor () {
    super()
    this._deletedArchives = []
  }

  get name () { return 'Trash' }
  get isEmpty () { return this._deletedArchives.length === 0 }
  get children () { return this._deletedArchives }

  async readData () {
    const deletedArchives = await beaker.archives.list({isSaved: false})
    this._deletedArchives = deletedArchives.map(a => new FSArchive(a))
  }
}

module.exports = {FSVirtualRoot, FSVirtualFolder_Library, FSVirtualFolder_Friends, FSVirtualFolder_Trash}
