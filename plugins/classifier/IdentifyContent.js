/**
 * IdentifyContent
 *
 * This class is used to identify the content of a document. It does so by
 * searching text strings for matches to given keys. Based upon the matches
 * the content type is determined.
 */

var IdentifyContent = function () {
    // The name of the class to be used in any Logger logs.
  var name = 'IdentifyContent'

    // Properties to store information used within the class.
  var matches = []  // To track matches found.
  var docTypes = []  // An array of objects defining different document types.
  var numTypes = 0   // The number of document types.

    // Properties to track execution of required methods.
  var haveTypes = false
  var haveMatches = false

    /*
   * Error message definitions. The following constants also work as the index
   * into the errorMessageList[] array. So order is important.
   */
  var NOERROR = 0
  var ERROR = 1
  var ERROR_DOCTYPES_MISSING = 2
  var ERROR_MATCHES_MISSING = 3
  var ERROR_NOMATCH = 4

  var errorMessageList = [
    'No errors.',
    'Found errors.',
    'The document types have not been set.',
    'Find Matches has not been executed.',
    'Not able to identify document.'
  ]

    /**
     * This method is used to provide the object with the different content
     * types and their corresponding keys.
     *
     * This method must be called first!
     *
     * @param  {array} theContentTypes - An array of JSON objects. The format is:
     *                                   documentTypes = [
     *                                       {
     *                                           'type': 'aDocumentType',
     *                                           'keys': [
     *                                               'key1',
     *                                               'key2',
     *                                           ],
     *                                       },
     *                                   ];
     * @return {JSON}              - See theResponse() for definition.
     */
  this.setContentTypes = function (theContentTypes) {
        // Clone the document types since they are passed by reference.
    docTypes = JSON.parse(JSON.stringify(theContentTypes))
    numTypes = docTypes.length

        // Set each array element to the default object used to track matches.
    for (var i = 0; i < numTypes; i++) {
      matches[i] = {
        numKeys: docTypes[i].keys.length,
        sumAllMatches: 0,
        bitStrMatched: 0x0,
        sumIndividualMatches: []}
    }

        // We have received the document types.
    haveTypes = true
    return theResponse(NOERROR)
  }

    /**
     * This method searches for matches within the given text string.
     *
     * The setContentTypes() method must be called before this method. This method
     * can be called mutliple times if there are multiple text strings to check.
     *
     * For each document type, provided to setContentTypes(), this method checks
     * each document key to see if it can be found in the text string. The
     * findings are tracked in the array matches. For each document type, an
     * object is used to track the matches. The following is tracked on a per
     * document type basis:
     * - sumAllMatches: the sum of all matches found
     * - bitStrMatched: the bit corresponding to the matched key is set
     * - sumIndividualMatches: an array of the sums of matches for each individual key
     *
     * @param  {string} text - A text string to search
     * @return {JSON}        - See theResponse() for definition.
     */
  this.findMatchesInText = function (text) {
        // To proceed, setContentTypes() must have already been called.
    if (!haveTypes) {
      return theResponse(ERROR_MATCHES_MISSING)
    }

        // For the given text string loop through the different document types.
    for (var i = 0; i < numTypes; i++) {
            // Loop though the keys of the current document type.
      var numKeys = docTypes[i].keys.length
      for (var j = 0; j < numKeys; j++) {
                // Initialize the individual sums if required.
        if (isNaN(matches[i].sumIndividualMatches[j])) {
          matches[i].sumIndividualMatches[j] = 0
        }

                // See if the key has a match within the text string.
        if (text.toLowerCase().indexOf(docTypes[i].keys[j]) > -1) {
                    // Add to the sum of the overall key matches found.
          matches[i].sumAllMatches += 1

                    // Set the bit of the specific key matched.
          matches[i].bitStrMatched |= (1 << j)

                    // Add to the sum of the specific key matched.
          matches[i].sumIndividualMatches[j] += 1
        }
      }
    }

        // We have received the document types.
    haveMatches = true
    return theResponse(NOERROR)
  }

    /**
     * This method attempts to determine the document type. Its decision is
     * based upon the matches found by findMatchesInText().
     *
     * The findMatchesInText() method must be called before this method. This
     * method is call last.
     *
     * @return {JSON } - See theResponse() for definition.
     */
  this.getContentType = function () {
        // To proceed, getMatchesInText() must have already been called.
    if (!haveMatches) {
      return theResponse(ERROR_DOCTYPES_MISSING)
    }

    var percentMatched = 0 // A percentage of 0 is no match found.
    var typeMatched

        // Find the key with the highest percentage of matches.
    for (var i = 0; i < numTypes; i++) {
            /*
             * The number of bits set is the number of keys matched. So the
             * percentage is the number of keys matched divided by the number
             * of keys.
             */
      bitsSet = countSetBits(matches[i].bitStrMatched)
      percentage = bitsSet / matches[i].numKeys

            // Save it if it is the largest percentage.
      if (percentage > percentMatched) {
        percentMatched = percentage
        typeMatched = i
      }
    }

        // Was a match found? Currenlty need 100% of keys matched.
    if (percentMatched !== 1) {
      return theResponse(ERROR_NOMATCH)
    } else {
      return theResponse(NOERROR, {contentType: typeMatched, probability: percentMatched})
    }
  }

    /**
     * This function finds the number of bits set in the input number. The
     * input number must be less than 32 bits long.
     *
     * @param  {number} bitStr - The number to check for bits set.
     * @return {number}        - The number of bits set in the input number.
     */
  var countSetBits = function (bitStr) {
    if (bitStr <= 0) {
      return 0
    }

    bitStr = bitStr - ((bitStr >> 1) & 0x55555555)
    bitStr = (bitStr & 0x33333333) + ((bitStr >> 2) & 0x33333333)

    return (((bitStr + (bitStr >> 4)) & 0x0F0F0F0F) * 0x01010101) >> 24
  }

    /**
   * This functions sets the response JSON information that is returned by
   * a method.
   *
   * @param  {number} code         - The code indicating success or failure
   *                                    that isinserted in the response JSON
   *                                    object.
   * @param  {array}  theType - array of JSON objects.
   * @return {JSON}
   */
  var theResponse = function (code, result) {
    if (result !== undefined) {
      return {code: code, msg: errorMessageList[code], result: result}
    } else {
      return {code: code, msg: errorMessageList[code]}
    }
  }
}

module.exports = IdentifyContent
