/* globals beaker */

const assert = require('assert')
const {FSContainer} = require('./base')
const {FSArchive} = require('./archive')
const {diffUpdate} = require('./util')

class FSVirtualFolder extends FSContainer {
  constructor () {
    super()
    this._children = []
  }

  get type () { return 'folder' }
  get isEmpty () { return this._children.length === 0 }
  get children () { return this._children }

  async readData () {
    // fetch new children and update via diff
    var newChildren = await this.readChildren()
    this._children = diffUpdate(this._children, newChildren)
    this.sortChildren()
  }

  // should be overridden by subclass
  async readChildren () {
    return this._children
  }

  sortChildren () {
    this._children.sort((a, b) => a.name.localeCompare(b.name))
  }
}

class FSVirtualRoot extends FSVirtualFolder {
  get type () { return 'root folder' }
  get url () { return 'virtual://root' }
  get name () { return 'Root' }

  async readChildren () {
    // read user profile
    const profile = await beaker.profiles.getCurrentUserProfile()
    profile.isCurrentUser = true

    // read followed profiles
    const followedProfiles = await Promise.all((profile.followUrls || []).map(beaker.profiles.getUserProfile))
    const followedFolders = followedProfiles.map(p => new FSVirtualFolder_User(p))

    // generate children
    return [
      new FSVirtualFolder_User(profile),
      new FSVirtualFolder_Network(),
      ...followedFolders,
      new FSVirtualFolder_Trash()
    ]
  }

  sortChildren () {
    // dont sort
  }
}

class FSVirtualFolder_User extends FSVirtualFolder {
  constructor (profile) {
    super()
    this._profile = profile
  }

  get name () { return this._profile.name || 'Anonymous' }
  get url () { return 'virtual://user-' + this._profile._origin }

  copyDataFrom (node) {
    this._profile = node._profile
  }

  async readChildren () {
    // read source set of archives
    var archives
    if (this._profile.isCurrentUser) {
      archives = await beaker.archives.list({isSaved: true, isOwner: true})
    } else {
      // fetch their published archives
      archives = await beaker.archives.listPublished({author: this._profile._origin})
      // remove their profile archive if its in there (we want the direct source)
      archives = archives.filter(a => a.url !== this._profile._origin)
      // now add their profile archive to the front
      let profileArchive = new DatArchive(this._profile._origin)
      let profileArchiveInfo = await profileArchive.getInfo()
      archives.unshift(profileArchiveInfo)
    }
    return archives.map(a => new FSArchive(a))
  }
}

class FSVirtualFolder_Network extends FSVirtualFolder {
  get name () { return 'Network' }
  get url () { return 'virtual://network' }

  async readChildren () {
    const archives = await beaker.archives.list({isSaved: true, isOwner: false})
    return archives.map(a => new FSArchive(a))
  }

  // special helper
  // this folder has archives added arbitrarily on user access
  // so we need this method to add the archive
  addArchive (archiveInfo) {
    // all children share a sourceSet
    // so just add to one of them
    const alreadyExists = !!this._children[0]._sourceSet.find(item => item._archiveInfo.url === archiveInfo.url)
    if (!alreadyExists) {
      const archive = new FSArchive(archiveInfo)
      this._children[0]._sourceSet.push(archive)
    }
  }

  sortChildren () {
    // dont sort
  }
}

class FSVirtualFolder_Trash extends FSVirtualFolder {
  get name () { return 'Trash' }
  get url () { return 'virtual://trash' }

  async readChildren () {
    const archives = await beaker.archives.list({isSaved: false})
    return archives.map(a => new FSArchive(a))
  }
}

module.exports = {
  FSVirtualRoot,
  FSVirtualFolder,
  FSVirtualFolder_User,
  FSVirtualFolder_Network,
  FSVirtualFolder_Trash
}
