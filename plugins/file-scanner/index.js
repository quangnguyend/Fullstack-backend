const appConfig = require('../../appConfig')
const clam = require('clamscan')(appConfig.file_scan)

module.exports = (files, callback) => {
  let type = typeof files
  if (type !== 'array') {
    callback({ code: 400, msg: `Files must be an Array; Instead it was: ${type}` })
  }
  clam.scan_files(files, function (err, file, is_infected) {
    if (err) {
      return callback({ code: 422, msg: 'File was scannable' })
    }
    if (is_infected) {
      callback({ msg: 'File is infected'})
    } else {
      callback(null, { file: file, msg: 'File is clean'})
    }
  })
}
