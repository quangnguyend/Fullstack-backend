/**
 * This file contains the document types that are supported. For each supported
 * document type, there may be an additional object defining information specific
 * to that document type. When a document is upladed to the server, this
 * information is used to identify the document type. The text in the document is
 * searched to find matches with the keys that are in the o
 *
 * The format of the objects is:
 * - type: This is a string to identify the type of kind of document.
 * - keys: The is an array of strings. All of these keys should allow a document
 *         to be categorized of the given type.
 */

// Load any required files.

module.exports = {

    /*
     * The different types of documents supported. The keys are strings that
     * must be found in a document of the given type. It is possible to have
     * multiple entries with the same type.
     */
  supportedDocTypes: [
    {
      'type': 'bankStatment',
      'keys': [
        'statement',
        'accountnumber',
        'openingbalance',
        'closingbalance',
        'date'
      ]
    }
  ],

    /*
     * The different sources supported for the document types. The keys are
     * strings that must be found in a document of the given type. Each element
     * in this object must match a type from the above object.
     */
  supportedSources: {
    'bankStatment': [
      {
        'type': 'rbc',
        'keys': [
          'www.rbcroyalbank.com',
          'royalbankofcanada'
        ]
      },
      {
        'type': 'bmo',
        'keys': [
          'www.bmo.com',
          'bankofmontreal'
        ]
      }
    ]
  }

}
