var OCR = function () {
  this.parse = function (filepath, callback) {
    callback({code: 101, msg: 'OCR generic parser not yet supported'})
  }
}

module.exports = OCR
