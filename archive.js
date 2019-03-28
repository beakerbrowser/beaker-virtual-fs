/* globals DatArchive */

const {FSNode, FSContainer} = require('./base')
const {diffUpdate, sortCompare} = require('./util')
const BINARY_FILE_FORMATS = require('binary-extensions')

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
  constructor (parent, archive = null, archiveInfo = null) {
    super()
    this.parent = parent
    this._archive = archive
    this._archiveInfo = archiveInfo
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
        return new FSArchiveFolder(this, this._archive, this._archiveInfo, fileInfo.name, path, fileInfo.stat)
      }
      return new FSArchiveFile(this, this._archive, this._archiveInfo, fileInfo.name, path, fileInfo.stat)
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

  newFolder () {
    this._files.push(new FSArchiveFolder_BeingCreated(this, this._archive, this._archiveInfo, this._path))
  }

  newFile () {
    this._files.push(new FSArchiveFile_BeingCreated(this, this._archive, this._archiveInfo, this._path))
  }
}

class FSArchive extends FSArchiveContainer {
  get url () { return this._archive.url }
  get type () {
    let type = this._archiveInfo && this._archiveInfo.type
    if (!type || !type.length) return 'archive'
    type = type.filter(f => STANDARD_ARCHIVE_TYPES.includes(f))
    return type[0] || 'archive'
  }
  get name () { return (this._archiveInfo.title || '').trim() || 'Untitled' }
  get size () { return this._archiveInfo.size }
  get mtime () { return this._archiveInfo.mtime }

  async copy (newPath, targetArchiveKey) {
    this._archive = this._archive || new DatArchive(this._archiveInfo.key)
    if (this._archiveInfo.key === targetArchiveKey) {
      await this._archive.copy('/', newPath)
    } else {
      await DatArchive.exportToArchive({
        src: this._archive.url,
        dst: `dat://${targetArchiveKey}${newPath}`,
        skipUndownloadedFiles: true
      })
    }
  }
  
  async delete () {
    return DatArchive.unlink(this._archiveInfo.url)
  }
}

class FSArchiveFolder extends FSArchiveContainer {
  constructor (parent, archive, archiveInfo, name, path, stat) {
    super(parent, archive, archiveInfo)
    this._name = name
    this._path = path
    this._stat = stat
  }

  get url () { return this._archive.url + this._path }
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

  async copy (newPath, targetArchiveKey) {
    if (this._archiveInfo.key === targetArchiveKey) {
      await this._archive.copy(this._path, newPath)
    } else {
      await DatArchive.exportToArchive({
        src: this._archive.url + this._path,
        dst: `dat://${targetArchiveKey}${newPath}`,
        skipUndownloadedFiles: true
      })
    }
  }

  async move (newPath, targetArchiveKey) {
    if (this._archiveInfo.key === targetArchiveKey) {
      await this._archive.rename(this._path, newPath)
    } else {
      await DatArchive.exportToArchive({
        src: this._archive.url + this._path,
        dst: `dat://${targetArchiveKey}${newPath}`,
        skipUndownloadedFiles: true
      })
      await this._archive.rmdir(this._path, {recursive: true})
    }
  }

  async delete () {
    await this._archive.rmdir(this._path, {recursive: true})
  }
}

class FSArchiveFile extends FSNode {
  constructor (parent, archive, archiveInfo, name, path, stat) {
    super()
    this.parent = parent
    this._archive = archive
    this._archiveInfo = archiveInfo
    this._name = name
    this._path = path
    this._stat = stat
    this.fileData = null
  }

  get url () { return this._archive.url + this._path }
  get type () { return 'file' }
  get name () { return (this._name || '').trim() || 'Untitled' }
  get size () { return this._stat.size }
  get mtime () { return this._stat.mtime }
  get isEditable () { return this._archiveInfo.isOwner }

  get preivew () { return this.fileData } // compat with old api

  async readData ({ignoreCache, maxLength, maxPreviewLength, timeout} = {}) {
    if (this.fileData && !ignoreCache) {
      return
    }
    if (maxPreviewLength && !maxLength) {
      maxLength = maxPreviewLength // compat with old api
    }

    // only load a fileData if this file type is (probably) textual
    // assume textual if no extension exists
    var nameParts = this.name.split('.')
    if (nameParts.length > 1) {
      let ext = nameParts.pop()
      if (ext && BINARY_FILE_FORMATS.includes(ext.toLowerCase()) === true) {
        return
      }
    }

    // read the file
    var fileData = await this._archive.readFile(this._path, {encoding: 'utf8', timeout})
    if (maxLength && fileData.length > maxLength) {
      fileData = fileData.slice(0, maxLength - 3) + '...'
    }
    this.fileData = fileData
  }

  copyDataFrom (node) {
    this._archiveInfo = node._archiveInfo
    this._archive = node._archive
    this._name = node._name
    this._path = node._path
    this._stat = node._stat
    this.fileData = node.fileData || this.fileData // fileData may not be loaded yet so fallback to current
  }

  async rename (newName) {
    return rename(this, newName)
  }

  async copy (newPath, targetArchiveKey) {
    if (this._archiveInfo.key === targetArchiveKey) {
      await this._archive.copy(this._path, newPath)
    } else {
      await DatArchive.exportToArchive({
        src: this._archive.url + this._path,
        dst: `dat://${targetArchiveKey}${newPath}`,
        skipUndownloadedFiles: true
      })
    }
  }

  async move (newPath, targetArchiveKey) {
    if (this._archiveInfo.key === targetArchiveKey) {
      await this._archive.rename(this._path, newPath)
    } else {
      await DatArchive.exportToArchive({
        src: this._archive.url + this._path,
        dst: `dat://${targetArchiveKey}${newPath}`,
        skipUndownloadedFiles: true
      })
      await this._archive.unlink(this._path)
    }
  }

  async delete () {
    await this._archive.unlink(this._path)
  }
}

class FSArchiveFolder_BeingCreated extends FSContainer {
  constructor (parent, archive, archiveInfo, parentPath) {
    super()
    this.parent = parent
    this._archive = archive
    this._archiveInfo = archiveInfo
    this._parentPath = parentPath
  }

  get url () { return this._archive.url + this._parentPath }
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

  getPathForName (newName) {
    return this._parentPath + '/' + newName
  }
}

class FSArchiveFile_BeingCreated extends FSContainer {
  constructor (parent, archive, archiveInfo, parentPath) {
    super()
    this.parent = parent
    this._archive = archive
    this._archiveInfo = archiveInfo
    this._parentPath = parentPath
  }

  get url () { return this._archive.url + this._parentPath }
  get type () { return 'file' }
  get name () { return 'New file' }
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

  getPathForName (newName) {
    return this._parentPath + '/' + newName
  }
}

async function rename (node, newName) {
  var oldpath = node._path
  var newpath = node._path.split('/').slice(0, -1).join('/') + '/' + newName
  await node._archive.rename(oldpath, newpath)
}

module.exports = {
  FSArchiveContainer,
  FSArchive,
  FSArchiveFolder,
  FSArchiveFile,
  FSArchiveFolder_BeingCreated,
  FSArchiveFile_BeingCreated
}
