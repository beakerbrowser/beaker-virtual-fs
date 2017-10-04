/* globals DatArchive */

const {FSNode, FSContainer} = require('./base')
const {diffUpdate, sortCompare} = require('./util')
const TEXTUAL_FILE_FORMATS = require('text-extensions')
TEXTUAL_FILE_FORMATS.push('datignore')

const STANDARD_ARCHIVE_TYPES = [
  'application',
  'module',
  'dataset',
  'documents',
  'music',
  'photos',
  'user-profile',
  'videos',
  'website'
]

class FSArchiveContainer extends FSContainer {
  constructor (parent, archiveInfo) {
    super()
    this.parent = parent
    this._archiveInfo = archiveInfo
    this._archive = null
    this._path = ''
    this._files = []
  }

  get isEmpty () { return this._files.length === 0 }
  get children () { return this._files }
  get isEditable () { return this._archiveInfo.isOwner }

  async readData () {
    // load all children
    this._archive = this._archive || new DatArchive(this._archiveInfo.url)
    var fileInfos = await this._archive.readdir(this._path, {stat: true})
    var newFiles = fileInfos.map(fileInfo => {
      const path = this._path + '/' + fileInfo.name
      if (fileInfo.stat.isDirectory()) {
        return new FSArchiveFolder(this, this._archiveInfo, this._archive, fileInfo.name, path, fileInfo.stat)
      }
      return new FSArchiveFile(this, this._archiveInfo, this._archive, fileInfo.name, path, fileInfo.stat)
    })
    this._files = diffUpdate(this._files, newFiles)
  }

  sort (column, dir) {
    this._files.forEach(file => file.sort(column, dir))
    this._files.sort((a, b) => {
      // directories at top
      if (a.isContainer && !b.isContainer) { return -1 }
      if (!a.isContainer && b.isContainer) { return 1 }
      // by current setting
      return sortCompare(a, b, column, dir)
    })
  }

  copyDataFrom (node) {
    this._archiveInfo = node._archiveInfo
    this._archive = node._archive
    this._path = node._path
  }
}

class FSArchive extends FSArchiveContainer {
  get url () { return this._archiveInfo.url }
  get type () {
    let type = this._archiveInfo && this._archiveInfo.type
    if (!type || !type.length) return 'archive'
    type = type.filter(f => STANDARD_ARCHIVE_TYPES.includes(f))
    return type[0] || 'archive'
  }
  get name () { return (this._archiveInfo.title || '').trim() || 'Untitled' }
  get size () { return this._archiveInfo.size }
  get mtime () { return this._archiveInfo.mtime }
  
  async delete () {
    return DatArchive.unlink(this._archiveInfo.url)
  }
}

class FSArchiveFolder extends FSArchiveContainer {
  constructor (parent, archiveInfo, archive, name, path, stat) {
    super(parent, archiveInfo)
    this._archive = archive
    this._name = name
    this._path = path
    this._stat = stat
  }

  get url () { return this._archiveInfo.url + this._path }
  get type () { return 'folder' }
  get name () { return (this._name || '').trim() || 'Untitled' }
  get size () { return this._stat.size }
  get mtime () { return this._stat.mtime }

  copyDataFrom (node) {
    this._archiveInfo = node._archiveInfo
    this._archive = node._archive
    this._name = node._name
    this._path = node._path
    this._stat = node._stat
  }

  async rename (newName) {
    return rename(this, newName)
  }

  async copy (newPath) {
    await this._archive.copy(this._path, newPath)
  }

  async move (newPath) {
    await this._archive.rename(this._path, newPath)
  }

  async delete () {
    await this._archive.rmdir(this._path, {recursive: true})
  }
}

class FSArchiveFile extends FSNode {
  constructor (parent, archiveInfo, archive, name, path, stat) {
    super()
    this.parent = parent
    this._archiveInfo = archiveInfo
    this._archive = archive
    this._name = name
    this._path = path
    this._stat = stat
    this.preview = null
  }

  get url () { return this._archiveInfo.url + this._path }
  get type () { return 'file' }
  get name () { return (this._name || '').trim() || 'Untitled' }
  get size () { return this._stat.size }
  get mtime () { return this._stat.mtime }
  get isEditable () { return this._archiveInfo.isOwner }

  async readData () {
    if (this.preview) {
      return
    }

    // load a preview if this file type is (probably) textual
    var ext = this.name.split('.').pop()
    if (!ext) {
      return
    }
    ext = ext.toLowerCase()
    if (!TEXTUAL_FILE_FORMATS.includes(ext)) {
      return
    }

    // read the file and save the first 500 bytes
    try {
      var fileData = await this._archive.readFile(this._path, 'utf8')
      if (fileData.length > 500) {
        fileData = fileData.slice(0, 500) + '...'
      }
      this.preview = fileData
    } catch (e) {
      console.log('Failed to load preview', e, this)
    }
  }

  copyDataFrom (node) {
    this._archiveInfo = node._archiveInfo
    this._archive = node._archive
    this._name = node._name
    this._path = node._path
    this._stat = node._stat
    this.preview = node.preview || this.preview // preview may not be loaded yet so fallback to current
  }

  async rename (newName) {
    return rename(this, newName)
  }

  async copy (newPath) {
    await this._archive.copy(this._path, newPath)
  }

  async move (newPath) {
    await this._archive.rename(this._path, newPath)
  }

  async delete () {
    await this._archive.unlink(this._path)
  }
}

class FSArchiveFolder_BeingCreated extends FSContainer {
  constructor (parent, archiveInfo, archive, parentPath) {
    super()
    this.parent = parent
    this._archiveInfo = archiveInfo
    this._archive = archive
    this._parentPath = parentPath
  }

  get url () { return this._archiveInfo.url + this._parentPath }
  get type () { return 'folder' }
  get name () { return 'New folder' }
  get size () { return 0 }
  get mtime () { return 0 }
  get isEmpty () { return true }
  get children () { return [] }
  get isEditable () { return true }

  copyDataFrom (node) {
    this._archiveInfo = node._archiveInfo
    this._archive = node._archive
    this._parentPath = node._parentPath
  }

  async rename (newName) {
    return this._archive.mkdir(this._parentPath + '/' + newName)
  }
}

async function rename (node, newName) {
  var oldpath = node._path
  var newpath = node._path.split('/').slice(0, -1).join('/') + '/' + newName
  await node._archive.rename(oldpath, newpath)
}

module.exports = {FSArchiveContainer, FSArchive, FSArchiveFolder, FSArchiveFile, FSArchiveFolder_BeingCreated}
