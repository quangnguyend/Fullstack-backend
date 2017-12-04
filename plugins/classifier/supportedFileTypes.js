/**
 * This object contains the file types that are supported. For each supported
 * file type, the following information is given:
 *
 * - format: This is a string to identify the format of a file of the given type.
 * - parser: The is an instance of the parser class to be used to parse a file of
 *           the given type. The file containing the class must be loaded from
 *           its respective directory and the class must have a method called parse.
 */

// Load the required parser classes.
var CSV = require('./parsers/CSV')
var OCR = require('./parsers/OCR')
var PDF = require('./parsers/PDF')

// Define the file types that are supported and the respective parsers.
var supportedFileTypes = {
  'csv': {
    'format': 'csv',
    'parser': new CSV(),
    'keys': null
  },
  'doc': {
    'format': 'doc',
    'parser': null,
    'keys': null
  },
  'docx': {
    'format': 'doc',
    'parser': null,
    'keys': null
  },
  'xls': {
    'format': 'excel',
    'parser': null,
    'keys': null
  },
  'xlsx': {
    'format': 'excel',
    'parser': null,
    'keys': null
  },
  'pdf': {
    'format': 'pdf',
    'parser': new PDF(),
    'keys': null
  },
  'png': {
    'format': 'image',
    'parser': new OCR(),
    'keys': null
  },
  'jpeg': {
    'format': 'image',
    'parser': new OCR(),
    'keys': null
  },
  'jpg': {
    'format': 'image',
    'parser': new OCR(),
    'keys': null
  }
}

module.exports = supportedFileTypes
