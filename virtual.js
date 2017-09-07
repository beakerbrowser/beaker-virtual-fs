/* globals beaker */

const assert = require('assert')
const {FSContainer} = require('./base')
const {FSArchive} = require('./archive')

class FSVirtualFolder extends FSContainer {
  constructor () {
    super()
    this._children = []
  }

  get type () { return 'folder' }
  get isEmpty () { return this._children.length === 0 }
  get children () { return this._children }

  async readData () {
    this._children = await this.readChildren()
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
  get name () { return 'Root' }

  async readChildren () {
    // read user profile
    var profile = await beaker.profiles.getCurrentProfile()

    // generate children
    return [
      new FSVirtualFolder_User(profile),
      new FSVirtualFolder_Network(),
      new FSVirtualFolder_Trash()
    ]
  }

  sortChildren () {
    // dont sort
  }
}

class FSVirtualFolderWithTypes extends FSVirtualFolder {
  // helper to produce the child sets
  async createTypeChildren (sourceSet) {
    return [
      new FSVirtualFolder_TypeFilter(sourceSet, 'All', false),
      new FSVirtualFolder_TypeFilter(sourceSet, 'Applications', 'application'),
      new FSVirtualFolder_TypeFilter(sourceSet, 'Code modules', 'module'),
      new FSVirtualFolder_TypeFilter(sourceSet, 'Datasets', 'dataset'),
      new FSVirtualFolder_TypeFilter(sourceSet, 'Documents', 'document'),
      new FSVirtualFolder_TypeFilter(sourceSet, 'Music', 'music'),
      new FSVirtualFolder_TypeFilter(sourceSet, 'Photos', 'photo'),
      new FSVirtualFolder_TypeFilter(sourceSet, 'User profiles', 'user-profile'),
      new FSVirtualFolder_TypeFilter(sourceSet, 'Videos', 'video'),
      new FSVirtualFolder_TypeFilter(sourceSet, 'Websites', 'website')
    ]
  }
}

class FSVirtualFolder_TypeFilter extends FSVirtualFolder {
  constructor (sourceSet, label, type) {
    super()
    this._sourceSet = sourceSet
    this._label = label
    this._type = type
  }

  get name () { return this._label }

  async readChildren () {
    if (this._type) {
      return this._sourceSet.filter(child => (
        child._archiveInfo.type.includes(this._type)
      ))
    }
    // no filter
    return this._sourceSet
  }
}

class FSVirtualFolder_User extends FSVirtualFolderWithTypes {
  constructor (profile) {
    super()
    this._profile = profile
  }

  get name () { return this._profile.name || 'Anonymous' }

  async readChildren () {
    // read source set of archives
    // TODO read archives of user other than local
    const archives = await beaker.archives.list({isSaved: true, isOwner: true})
    const sourceSet = archives.map(a => new FSArchive(a))
    return this.createTypeChildren(sourceSet)
  }
}

class FSVirtualFolder_Network extends FSVirtualFolder {
  get name () { return 'Network' }

  async readChildren () {
    // read user profile
    const profile = await beaker.profiles.getCurrentProfile()

    // read followed profiles
    const followedProfiles = await Promise.all((profile.followUrls || []).map(beaker.profiles.getProfile))
    const followedFolders = followedProfiles.map(p => new FSVirtualFolder_User(p))

    // generate children
    return [
      new FSVirtualFolder_Saved(),
      new FSVirtualFolder_Rehosting(),
      ...followedFolders
    ]
  }

  sortChildren () {
    // dont sort
  }
}

class FSVirtualFolder_Saved extends FSVirtualFolderWithTypes {
  get name () { return 'Saved' }

  async readChildren () {
    const deletedArchives = await beaker.archives.list({isSaved: true, isOwner: false})
    const sourceSet = deletedArchives.map(a => new FSArchive(a))
    return this.createTypeChildren(sourceSet)
  }
}

class FSVirtualFolder_Rehosting extends FSVirtualFolderWithTypes {
  get name () { return 'Rehosting' }

  async readChildren () {
    const deletedArchives = await beaker.archives.list({isSaved: true, isOwner: false, networked: true})
    const sourceSet = deletedArchives.map(a => new FSArchive(a))
    return this.createTypeChildren(sourceSet)
  }
}

class FSVirtualFolder_Trash extends FSVirtualFolderWithTypes {
  get name () { return 'Trash' }

  async readChildren () {
    const deletedArchives = await beaker.archives.list({isSaved: false})
    const sourceSet = deletedArchives.map(a => new FSArchive(a))
    return this.createTypeChildren(sourceSet)
  }
}

module.exports = {
  FSVirtualRoot,
  FSVirtualFolder,
  FSVirtualFolderWithTypes,
  FSVirtualFolder_TypeFilter,
  FSVirtualFolder_User,
  FSVirtualFolder_Network,
  FSVirtualFolder_Saved,
  FSVirtualFolder_Rehosting,
  FSVirtualFolder_Trash
}
