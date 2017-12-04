var CSV = function () {
  this.parse = function (filepath, callback) {
    callback({code: 101, msg: 'CSV generic parser not yet supported'})
  }
}

module.exports = CSV
