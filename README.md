# beaker-virtual-fs

This module wraps a number of different APIs in generic "file" objects. The generic objects can be used to simplify rendering.

The generic interface is used on *all objects*. It is defined as follows:

```js
class FSNode {
  get url () { return false }
  get type () { return 'node' }
  get name () { return '' }
  get size () { return 0 }
  get mtime () { return 0 }
  get isContainer () { return false } // is folder-like?
  get isEmpty () { return true } // has children?
  get children () { return [] }

  // load any data needed to display the node in the sidebar or in the expanded state
  async readData () {}
}
```

The following classes are exported by this module:

```js
const {
  FSNode, // root interface for all objects, should be subclassed
  FSContainer, // root interface for all folder-like objects, should be subclassed

  FSVirtualRoot, // the root of the FS; contains the virtual folders below
  FSVirtualFolder_Library, // contains all of the archives created by the user
  FSVirtualFolder_Friends, // contains all of the users followed by the user
  FSVirtualFolder_Trash, // contains all of the archives deleted by the user
  
  FSArchiveContainer, // root interface for all folder-like archive objects, should be subclassed
  FSArchive, // an archive
  FSArchiveFolder, // a folder within an archive
  FSArchiveFile // a file within an archive
} = require('beaker-virtual-fs')
```

Currently the only two classes you'll want to instantiate directly are `FSVirtualRoot` and `FSArchive`. Here are their usages:

```js
var root = new FSVirtualRoot()
var archive = new FSArchive(archiveInfo) // archiveInfo is provided from beaker.archives or DatArchive#getInfo()
```