// Get any required files.
var util = require('util')
var fs = require('fs')
var PDFParser = require('../../../node_modules/pdf2json/pdfparser')

var initLogger = require('../../logger/logger').init
const {info, warn, error} = initLogger(__filename)

/*
 * Load the class that is used to identify the type and source of a document.
 * Also load the supporting files that are used together with the class.
 */
var IdContent = require('../IdentifyContent')
var docTypes = require('./supportedDocInfo').supportedDocTypes
var sources = require('./supportedDocInfo').supportedSources

/*
 * this is the switch for turning the writing of the drag and drop file
 * snippets into the folder /server/analyze/
 */
var writeSwitch = false

/**
 * The Cursor object is used to traverse the snippets of a page.
 * We track the current snippet position and navigate through them from
 * 0 to snippets.length looking for string matches.
 */
var Cursor = function (snippets) {
  var position = 0
  this.lastSnippet = null
  this.snippet = null

  this.hasNext = function () {
    return position < snippets.length - 1
  }

  this.next = function () {
    this.lastSnippet = this.snippet
    position++
    this.snippet = snippets[position]
    return this.snippet
  }

  this.parseUntil = function (str) {
    do {
      this.next()
    } while (this.snippet.text.toLowerCase().indexOf(str.toLowerCase()) === -1)
    return this.snippet
  }
}

/**
 * The Generic PDF parser is responsible for identifying the type of PDF document
 * that we are analyzing, as well as the source from where it came from. In the case that
 * we are unable to identify either of these fields we simply return a field value of
 * 'unknown'.
 *
 *  1. Check what the type is for that source (ex: Bank Statement, Contract, Legal)
 *  2. Check what the source is (ex: RBC || BMO)
 */
var PDF = function () {
  // The name of the class to be used in any Logger logs.
  var name = 'PDF'

  /**
   * This method parses a PDF file. When successfully parsed, the type and
   * source of the document is determined.
   *
   * @param  {string}   filepath - The path of the PDF file to parse.
   * @param  {Function} callback - The callback function to call when parsing
   *                               is complete.
   * @return             - Nothing. The callback function is used.
   */
  this.parse = function (filepath, callback) {
    info(name + ': Running generic pdf parser on ' + filepath)

    // Check that callback is a function.
    if (typeof callback !== 'function') {
      warn(name + ': Incorrect usage of parse() please set the callback function.')
      return
    }

    // Instantiate a new parser.
    var pdfParser = new PDFParser()

    /*
     * This event is raised when there is an error during the parsing of the
     * PDF file. The parsing of the PDF file is started by the call to
     * pdfParser.loadPDF().
     */
    pdfParser.on('pdfParser_dataError', function (err) {
      error(name + ': Error: PdfParser Data Error', {err})
      callback({ code: 1, msg: 'PdfParser Data Error'})
    })

    /*
     * This event is raised when the PDF parsing has finished. The parsing of
     * the PDF file is started by the call to pdfParser.loadPDF().
     *
     * It will take the parsed file and reduce it to the data that is required.
     * Then, if turned on, it will write the data to a file. Finally it will
     * determine the type and source of the file.
     */
    pdfParser.on('pdfParser_dataReady', function (pdfData) {
      // Extract only the data that is required.
      info(name + ': Extracting JSON Snippets')
      var snippets = extractSnippets(pdfData)
      info(snippets)

          // If turned on, write the snippets to a file.
      if (writeSwitch) {
        var snippetsFile = filepath.replace('/data/', '/analyze/') + '.txt'
        info(name + ': Saving snippets to: ' + snippetsFile)

        fs.writeFile(snippetsFile, util.inspect(snippets, 'utf-8'), function (err) {
          if (err) {
            error(name + ': Error writting snippets: ', {err})
          } else {
            info(name + ': Successfully wrote snippets to: ' + snippetsFile)
          }
        })
      }

      /*
       * Initialize the default object. Then identify the document type.
       *
       * type =   Reference to the type of PDF document.
       * source = Where the PDF document is coming from.
       */
      var json = { source: 'unknown', type: 'unknown' }
      json.type = identifyContent(docTypes, snippets)

      // Now identify the source if there are sources for the document type.
      if (sources[json.type] !== undefined) {
        json.source = identifyContent(sources[json.type], snippets)
      }
      info(name + ': The source and type of the PDF document is:')

      info(name + ': Calling callback')
      callback(null, json)
    })

    // Start parsing the given PDF file.
    pdfParser.loadPDF(filepath)
  }

  /**
   * This function extracts those parts from given JSON object that are required.
   *
   * @param  {JSON} pdf - The output of pdf2json.
   * @return {JSON}     - An array of page snippets. Each snippet contains the
   *                      text and the X,Y coordinates
   */
  var extractSnippets = function (pdf) {
    return pdf.formImage.Pages.map(function (page) {
      return page.Texts.map(function (text) {
        return {
          text: decodeURIComponent(text.R[0].T),
          x: text.x,
          y: text.y
        }
      })
    })
  }

  /**
   * This function identifies the type of content.
   *
   * @param  {array} contentTypes - This is an array of content types and the
   *                                corresponding keys to be used to identify
   *                                the given type.
   * @param  {array} snippets     - These are the snippets extracted from the
   *                                PDF document.
   * @return {string}             - A string identifying the type.
   */
  var identifyContent = function (contentTypes, snippets) {
    // Instantiate a new object and give it the list of content types.
    var identifyDoc = new IdContent()
    var result = identifyDoc.setContentTypes(contentTypes)
    if (result.code !== 0) {
      // An error occurred so get out.
      return 'unknown'
    }

    // For each page pass the snippets to the object for it to search for key matches.
    for (var page = 0; page < snippets.length; page++) {
      var c = new Cursor(snippets[page])
      while (c.hasNext()) {
        c.next()
        result = identifyDoc.findMatchesInText(c.snippet.text)
        if (result.code !== 0) {
          // An error occurred so get out.
          return 'unknown'
        }
      }
    }

    // Get the content type that was identified.
    result = identifyDoc.getContentType()
    if (result.code === 0) {
      return contentTypes[result.result.contentType].type
    }

    // Not able to determine the content type.
    return 'unknown'
  }
}

module.exports = PDF
