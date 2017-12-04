const formidable = require('formidable')
const mongoose = require('mongoose')
const connections = require('../../models/connections')
const gridStream = require('gridfs-stream')
const crypto = require('crypto')
const archiver = require('archiver')
const _ = require('lodash')
const debug = require('debug')('auvenir:file-manager')
const BufferReadable = require('stream').PassThrough
const Readable = require('stream').Readable
const EventEmitter = require('events').EventEmitter
const appConfig = require('../../config')

const defaultMaxFieldsSize = parseInt(appConfig.file_upload.maxFieldSize)
const defaultKeepExtensions = Boolean(appConfig.file_upload.keepExtensions)
const encryptAlgorithm = appConfig.security.file_encryption.algorithm
const encryptPassword = appConfig.security.file_encryption.secret

var initLogger = require('../logger/logger').init
const {info, warn, error} = initLogger(__filename)

let gfs = null
connections.auvenir.on('open', () => {
  gfs = gridStream(connections.auvenir.db, mongoose.mongo)
})

/**
 * private inner class
 * Class of the file obj in the collection
 */
class File extends EventEmitter {
  constructor (name, path, type) {
    super()
    this.name = name
    this.type = type
    this.path = path
    this.size = 0
    this.root = null
    this.id = null
    this.lastModified = new Date()
  }
}

/**
 * Upload a file in the request form data to mongodb gridfs
 * @param options options obj must have a validate function.
 * @constructor
 */
function Uploader (options) {
  var self = this
  self.formFields = {}
  self.options = options

  if (typeof options.validate !== 'function') {
    throw new Error('Options should have a function for validation')
  }
  self.options.root = self.options.root || 'fs'

  var form = new formidable.IncomingForm()
  form.maxFieldsSize = options.maxFieldsSize || defaultMaxFieldsSize
  form.keepExtensions = options.keepExtensions || defaultKeepExtensions
  form.__filename = options.filename || function (formFields, filename) {
    return filename
  }
  form.onPart = self.onPart.bind(self)
  self.form = form
}

/**
 * parse the form and begin to store the data to mongodb gridfs
 * @param req node http request obj
 * @param callback err, fields, files will be passed in
 */
Uploader.prototype.parse = function (req, callback) {
  var self = this
  var form = this.form
  var aborted = false
  form.on('field', function (name, value) {
    self.formFields[name] = value
  })
  form.on('progress', function (bytesReceived, bytesExpected) {
    debug(`file upload progress ${bytesReceived} / ${bytesExpected}`)
  })
  form.on('aborted', function () {
    error('User Left During File Upload')
    aborted = true
  })
  form.parse(req, (err, fields, files) => {
    if (aborted) {
      return callback({code: 333, msg: 'User Left During File Upload'})
    }

    callback(err, fields, files)
  })
}

/**
 * form data event listener
 * will pipe data to gridfs writing stream
 * will encrypt data if encrypt is enable
 * @param part
 * @returns {*}
 */
Uploader.prototype.onPart = function (part) {
  var form = this.form

  if (undefined === part.filename) return form.handlePart(part)

  var err = this.options.validate(this.formFields, part.filename, part.mime)
  if (_.isBoolean(err) && !err) {
    return done(new Error('Error on parameters'))
  }
  if (_.isString(err) && err) {
    return done(new Error(err))
  }
  if (_.isError(err)) {
    return done(err)
  }

  ++form._flushing
  debug(`file upload on part. ${JSON.stringify(part)}`)
  var filename = form.__filename(this.formFields, part.filename)
  var file = new File(filename, filename, part.mime)

  var options = {mode: 'w', content_type: file.type, filename: file.path, root: this.options.root}
  if (form.chunk_size) options.chunk_size = form.chunk_size
  options.metadata = {encrypted: this.options.encrypt}
  var gfsWriteStream = gfs.createWriteStream(options)
  var rs = new BufferReadable()
  var encrypt = crypto.createCipher(encryptAlgorithm, encryptPassword)
  if (this.options.encrypt) {
    rs.pipe(encrypt).pipe(gfsWriteStream)
  } else {
    rs.pipe(gfsWriteStream)
  }

  part.on('data', onData)
  gfsWriteStream.on('progress', onProgress)
  gfsWriteStream.once('error', done)
  part.once('end', onEnd)

  function onProgress (size) {
    file.lastModified = new Date()
    file.size = size
    file.emit('progress', size)
  }

  function onData (data) {
    rs.write(data)
  }

  function onEnd () {
    part.removeListener('data', onData)
    part.removeListener('end', onEnd)
    gfsWriteStream.once('close', function () {
      done()
    })
    rs.end()
  }

  function done (err) {
    if (done.err) {
      return
    }
    if (err) {
      done.err = err
      return form.emit('error', done.err)
    }

    gfsWriteStream.removeListener('progress', onProgress)
    gfsWriteStream.removeListener('error', done)

    file.id || (file.id = gfsWriteStream._store.fileId)
    file.root = gfsWriteStream._store.root
    file.size = gfsWriteStream._store.position
    file.emit('end')

    --form._flushing

    form.emit('file', part.name, file)
    form._maybeEnd()
  }
}

/**
 * Mongodb gridfs file reader
 * @param options must contains a query obj which will be used to query the data
 *        query obj must have `root` value and _id or filename
 * @constructor
 */
function Reader (options) {
  this.option = options
  this.encrypted = false
}

/**
 * Check whether the file exists in the gridfs collection
 * @param callback err and file(if file found) will be passed in the callback function
 */
Reader.prototype.exists = function (callback) {
  var self = this
  gfs.findOne(this.option.query, function (err, file) {
    if (err) return callback(err)
    if (!file) {
      return callback(new Error('File Not Found'))
    }
    self.encrypted = file.metadata ? file.metadata.encrypted : false
    callback(null, file)
  })
}

/**
 * pipe the file read stream to a writable steam
 * @param w
 * @param callback callback the error
 * @returns {*}
 */
Reader.prototype.pipe = function (w, callback) {
  var gridFSStream = gfs.createReadStream(this.option.query)
  gridFSStream.on('error', function (err) {
    if (callback) {
      callback(err)
    }
  })
  if (this.encrypted) {
    return gridFSStream.pipe(crypto.createDecipher(encryptAlgorithm, encryptPassword)).pipe(w)
  } else {
    return gridFSStream.pipe(w)
  }
}

/**
 * Remove a File From a collection
 */
function Remover (options) {
  this.option = options
  this.encrypted = false
}

Remover.prototype.remove = function (callback) {
  gfs.remove(this.option.query, function (err, res) {
    if (err) {
      callback(err)
    } else {
      callback(null, res)
    }
  })
}

/**
 * Copy a file from a collection to another
 * @constructor
 */
function Copy () {
}

/**
 * get the source file information
 * @param query will be use to find the source file in the collection
 * @returns {Copy}
 */
Copy.prototype.from = function (query) {
  this.gridFSStream = gfs.createReadStream(query)
  return this
}

/**
 * Write the source file to the destination collection with specify name and file type
 * @param root destination collection
 * @param filename
 * @param fileType
 * @param callback err and file will be passed in
 */
Copy.prototype.to = function (root, filename, fileType, callback) {
  var gfsWriteStream = gfs.createWriteStream({mode: 'w', filename: filename, root: root, content_type: fileType})
  this.gridFSStream.pipe(gfsWriteStream)

  gfsWriteStream.on('error', function (err) {
    gfsWriteStream.removeListener('close', done)
    callback(err)
  })
  gfsWriteStream.on('close', done)

  function done (file) {
    callback(null, file)
  }
}

/**
 * Store a string into gridfs as a file
 * @param text
 * @constructor
 */
function TextStore (text) {
  if (!text) {
    throw new Error('Invalid text to save')
  }
  this.text = text
}

/**
 * specify the collection name, filename and file type then execute the storing process
 * @param root
 * @param fileName
 * @param fileType
 * @param callback
 */
TextStore.prototype.store = function (root, fileName, fileType, callback) {
  var s = new Readable()
  s.push(this.text)
  s.push(null)
  var gfsWriteStream = gfs.createWriteStream({mode: 'w', filename: fileName, root: root, content_type: fileType})
  s.pipe(gfsWriteStream)

  gfsWriteStream.on('error', function (err) {
    gfsWriteStream.removeListener('close', done)
    callback(err)
  })
  gfsWriteStream.on('close', done)

  function done (file) {
    callback(null, file)
  }
}

/**
 * Wrapper to find gridfs files
 * @param options
 * @constructor
 */
function Finder (options) {
  this.cursor = mongoose.connection.db.collection(options.root + '.files').find(options.query)
}

/**
 * Output the results as a files array
 * @param callback
 */
Finder.prototype.toArray = function (callback) {
  this.cursor.toArray(function (err, files) {
    if (err) {
      return callback(err)
    }
    if (!files || !files.length) {
      return callback(new Error('Files not found'))
    }
    callback(null, files)
  })
}

/**
 * Download a bunch of files as a zip file
 * @param options must have a files array which contains all file metadata obj
 *                must have a root parameter which specify the collection
 * @constructor
 */
function Downloader (options) {
  this.files = options.files
  this.root = options.root
}

/**
 * execute the archiving and retrieving process
 * @returns {Archiver} an instance of archive -> https://github.com/archiverjs/node-archiver
 */
Downloader.prototype.getArchive = function (error, end) {
  var self = this
  var archive = archiver('zip', {})

  archive.on('error', error)
  archive.on('end', end)

  this.files.forEach(function (file) {
    var gridFSStream = gfs.createReadStream({root: self.root, _id: file._id.toString()})
    const name = file.filename.split('/')[1]
    if (file.metadata && file.metadata.encrypted) {
      var cryptoStream = crypto.createDecipher(encryptAlgorithm, encryptPassword)
      gridFSStream.pipe(cryptoStream)
      archive.append(cryptoStream, {name: (name || file.filename)})
    } else {
      archive.append(gridFSStream, {name: (name || file.filename)})
    }
  })
  archive.finalize()

  return archive
}

module.exports = {
  Uploader: Uploader,
  Reader: Reader,
  Copy: Copy,
  TextStore: TextStore,
  Finder: Finder,
  Downloader: Downloader,
  Remover: Remover
}
