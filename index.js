const base = require('./base')
const virtual = require('./virtual')
const archive = require('./archive')
module.exports = Object.assign({}, base, virtual, archive)
