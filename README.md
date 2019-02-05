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
  get isEditable () { return false }
  get isContainer () { return false } // is folder-like?
  get isEmpty () { return true }
  get hasChildren () { return !this.isEmpty }
  get children () { return [] }

  // load any data needed to display the node in the sidebar or in the expanded state
  async readData () {}

  // used internally during diffs to copy state from the given node
  copyDataFrom (node) {}

  // sort the items according to the given params
  sort(column, dir) {}

  // mutators
  async rename (newName) {}
  async copy (newPath, targetArchiveKey) {}
  async move (newPath, targetArchiveKey) {}
  async delete () {}
}
```

The following classes are exported by this module:

```js
const {
  FSNode, // root interface for all objects, should be subclassed
  FSContainer, // root interface for all folder-like objects, should be subclassed

  FSVirtualFolder, // subclassable virtual folder
  FSVirtualItem, // subclassable virtual item
  
  FSArchiveContainer, // root interface for all folder-like archive objects, should be subclassed
  FSArchive, // an archive
  FSArchiveFolder, // a folder within an archive
  FSArchiveFile, // a file within an archive
  FSArchiveFolder_BeingCreated, // a temporary virtual folder that's in the process of having a name chosen
  FSArchiveFile_BeingCreated // a temporary virtual file that's in the process of having a name chosen
} = require('beaker-virtual-fs')
```
