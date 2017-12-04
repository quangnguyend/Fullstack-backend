/**
 * This file contains functions dealing with cryptography.
 */
var appConfig = require('../../config')
var crypto = require('crypto')
var algorithm = appConfig.security.crypto.algorithm
var password = appConfig.security.crypto.password

var Cryptography = {
    /**
     * This function encrypts the provided text string using a specific
     * algorithm. The password and algorithm are identified above and can be
     * overridden if desired. The algorithm is dependent upon OpenSSL.
     *
     * NOTE: Do not use this to encrypt passwords. This should only be used to
     *       encrypt something that at some point will have to be decrypted.
     *       Passwords do not have to be decrypted and should use bcrypt or
     *       PBKDF2 instead.
     *
     * @param  {String} text         - the text to be encrypted
     * @param  {String} thePassword  - the password to use when decrypting. This
     *                                 must be the same as what was used when
     *                                 encrypting the text. This is optional, if
     *                                 not provided the value at the top of this
     *                                 file is used.
     * @param  {String} theAlgorithm - the algorithm to use when decrypting. This
     *                                 must be the same as what was used when
     *                                 encrypting the text. This is optional, if
     *                                 not provided the value at the top of this
     *                                 file is used.
     * @return {String}              - the encrypted result
     */
  encrypt: function (text, thePassword, theAlgorithm) {
        // Has a password or algorithm been provided or should the default be used?
    var usePassword = (thePassword !== undefined) ? thePassword : password
    var useAlgorithm = (theAlgorithm !== undefined) ? theAlgorithm : algorithm

    var cipher = crypto.createCipher(useAlgorithm, usePassword)
    var encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    return encrypted
  },

    /**
     * This function decrypts the provided text string using a specific
     * algorithm. The password and algorithm are identified above and can be
     * overridden if desired. The algorithm is dependent upon OpenSSL.
     *
     * @param  {String} text         - the text to be decrypted
     * @param  {String} thePassword  - the password to use when decrypting. This
     *                                 must be the same as what was used when
     *                                 encrypting the text. This is optional, if
     *                                 not provided the value at the top of this
     *                                 file is used.
     * @param  {String} theAlgorithm - the algorithm to use when decrypting. This
     *                                 must be the same as what was used when
     *                                 encrypting the text. This is optional, if
     *                                 not provided the value at the top of this
     *                                 file is used.
     * @return {String}              - the decrypted result
     */
  decrypt: function (text, thePassword, theAlgorithm) {
        // Has a password or algorithm been provided or should the default be used?
    var usePassword = (thePassword !== undefined) ? thePassword : password
    var useAlgorithm = (theAlgorithm !== undefined) ? theAlgorithm : algorithm

    var decipher = crypto.createDecipher(useAlgorithm, usePassword)
    var decrypted = decipher.update(text, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

}
module.exports = Cryptography
