/**
 * Classifier
 *
 * This class is responsible for performing the first step in the classification
 * of a file. It is used whenever a file is uploaded from the client to the
 * server. The file is checked to see if the type (pdf, csv, etc) can be
 * determined. If the type is determined and supported then a parser specific to
 * that file type is called.
 */

// Load any required files.
var supportedFileTypes = require('./supportedFileTypes')
var initLogger = require('../logger/logger').init
const {info, warn } = initLogger(__filename)

var Classifier = function () {
  // The name of the class to be used in any Logger logs.
  var name = 'Classifier'

  // Properties to store information used within the class.
  var jsonData = {}

  /**
   * This method performs the first step of file classification.
   *
   * Determines the extension of the file provided and then calls the parser
   * for a file of that type. The parser will identify the type of document.
   *
   * @param {String}   filepath - The filepath of the uploaded file.
   * @param {function} callback - The callback function to be executed once the
   *                              classifier has finished.
   * @return Nothing is actually returned. The callback function is used instead.
   */
  this.classify = function (filepath, callback) {
    info(name + ': Classifying ' + filepath)

    // Check that callback is a function. Then initialize defaults.
    if (typeof callback !== 'function') {
      warn(name + ': Incorrect usage of classify() please set the callback function.')
      return
    }

    jsonData = {
      extension: 'unknown',
      format: 'unknown',
      source: 'unknown',
      type: 'unknown',
      parser: null }

    // Determine if the type of the uploaded file is supported.
    var result = determineFileType(filepath)
    if (result === null) {
      callback({code: 66, msg: 'Unsupported file type.'})
      return
    }

    // The file type is supported, now identify the type of document.
    info(name + ': Determining file type RESULT: ', result)
    identifyDocument(filepath, result, function (err, data) {
      if (err) {
        callback(err)
        return
      }

      info(name + ': Identifying Document RESULT: ')
      callback(null, {format: result.format, source: data.source, type: data.type})
    })
  }

  /**
   * This function gets the uploaded files extension. Using the extension it
   * determines if it is supported. If supported, additinal information is
   * returned for used in the next classification step.
   *
   * @param  {String} filepath - The filepath of the file being classified.
   * @return {JSON}            - Information specific to the file type that
   *                             will be used in the next classification step.
   */
  var determineFileType = function (filepath) {
    info(name + ': Determining file type ...')

    // Get the extension of the given file.
    var pattern = new RegExp('^.+\\.([a-zA-Z]+$)')
    var fileInfo = pattern.exec(filepath)
    var fileType = fileInfo[1]

    // Determine if the file type is supported.
    var fileTypeInfo = supportedFileTypes[fileType]
    if (fileTypeInfo !== undefined) {
      // File type is supported, return JSON for next step of classification.
      return {
        extension: fileType,
        format: fileTypeInfo.format,
        parser: fileTypeInfo.parser }
    }

    // The file type is not supported.
    return null
  }

  /**
   * This function begins the second step of classification. It calls the
   * parser specific to the type of file. The parser should read the raw data
   * from the file and save in a common format such as JSON.
   *
   * @param  {String}   filepath - The filepath of the file being classified.
   * @param  {JSON}     data     - The JSON object returned by the call to
   *                               function determineFileType().
   * @param  {Function} callback - The callback function to be executed once
   *                               the function has finished.
   * @return Nothing is actually returned. The callback function is used instead.
   */
  var identifyDocument = function (filepath, data, callback) {
    info(name + ': Identifying Document ...')
    if (!data.format) {
      callback({
        code: 67,
        msg: 'Missing data format for file with extension ' + data.extension + '.'})
      return
    }

    // Make sure there is a parser.
    if (data.parser === null) {
      callback({
        code: 68,
        msg: 'Parser unavailable for ' + data.format + ' files with extension ' + data.extension + '.'
      })
      return
    }

    // Call the parse method to parse the file.
    data.parser.parse(filepath, callback)
  }
}

module.exports = Classifier
