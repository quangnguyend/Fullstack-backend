/**
 * This modules is responsible for providing the appropriate access controls checks in order
 * to guarantee a that the appropriate users are allowed to access specific data model objects
 * at the time of the given operation.
 * @author Matt Felske
 */

var initLogger = require('../logger/logger').init
const { error } = initLogger(__filename)

const _ = require('lodash')
const debug = require('debug')('auvenir:routeHelper')
const Models = require('../../models')
const Utility = require('./utility')
const async = require('async')
const ObjectId = require('mongodb').ObjectID

/**
 * User AccessCheck for file upload
 * @param {String}   userID       - The userID to lookup
 * @param {Function} callback
 */
const userCheck = (userID, callback) => {
  debug('Running User access check ...')
  if (_.isNull(userID) || _.isUndefined(userID)) {
    return callback('Access Control user ID is missing.')
  }
  if (_.isNull(callback) || _.isUndefined(callback)) {
    return callback('Access Control callback function is missing.')
  }

  const USER_INFO = {
    type: 1,
    email: 1,
    firstName: 1,
    lastName: 1,
    phone: 1,
    jobTitle: 1,
    profilePicture: 1,
    lastLogin: 1
  }
  var objID = (typeof userID === 'string') ? ObjectId(userID) : userID// Utility.castToObjectId(userID)

  Models.Auvenir.User.findOne({ _id: objID }, USER_INFO, (err, oneUser) => {
    if (err) {
      error({ err })
      return callback('Error occured while querying a user object')
    }
    if (!oneUser) {
      return callback('Unable to find the specific user.')
    } else {
      switch (oneUser.status) {
        case 'PENDING':
        case 'WAIT-LIST':
          return callback('User is not currently able to use the platform.')
        case 'LOCKED':
          return callback('User is locked out of the platform.')
        case 'ACTIVE':
        case 'ONBOARDING':
          return callback(null, oneUser)
        default:
          return callback('Unable to validate the user.')
      }
    }
  })
}

/**
 * Runs an access control check against a business object and returns the result.
 * @param {ObjectId} id       - The model ObjectId
 * @param {ObjectId} userID   - The userID to check against the object's acl.
 * @param {Function} callback -
 */
const businessCheck = (id, userID, callback) => {
  debug('Running Business access check ...')
  if (_.isNull(id) || _.isUndefined(id)) {
    return callback('Access Control model ID is missing.')
  }
  if (_.isNull(userID) || _.isUndefined(userID)) {
    return callback('Access Control user ID is missing.')
  }
  if (_.isNull(callback) || _.isUndefined(callback)) {
    return callback('Access Control callback function is missing.')
  }

  var objID = Utility.castToObjectId(id)
  Models.Auvenir.Business.findOne({ _id: objID }, (err, oneBusiness) => {
    if (err) {
      error({ err })
      return callback('Error occured while attempting to query a business ID (' + objID + ')')
    }

    if (!oneBusiness) {
      return callback('Unable to find business object for given business ID (' + objID + ')')
    } else {
      var { acl } = oneBusiness
      for (var i = 0; i < acl.length; i++) {
        var entry = acl[i]
        if (entry.id.toString() === userID.toString()) {
          return callback(null, entry)
        }
      }
      return callback('Unable to find userID match in business object ACL.')
    }
  })
}

/**
 * Runs an access control check against a firm object and returns the result.
 * @param {ObjectId} id       - The model ObjectId
 * @param {ObjectId} userID   - The userID to check against the object's acl.
 * @param {Function} callback -
 */
const firmCheck = (id, userID, callback) => {
  debug('Running Firm access check ...')
  if (_.isNull(id) || _.isUndefined(id)) {
    return callback('Access Control model ID is missing.')
  }
  if (_.isNull(userID) || _.isUndefined(userID)) {
    return callback('Access Control user ID is missing.')
  }
  if (_.isNull(callback) || _.isUndefined(callback)) {
    return callback('Access Control callback function is missing.')
  }

  var objID = Utility.castToObjectId(id)
  Models.Auvenir.Firm.findOne({ _id: objID }, (err, oneFirm) => {
    if (err) {
      error({ err })
      return callback('Error occured while attempting to query a Firm ID (' + objID + ')')
    }

    if (!oneFirm) {
      return callback('Unable to find firm object for given Firm ID (' + objID + ')')
    } else {
      var { acl } = oneFirm
      for (var i = 0; i < acl.length; i++) {
        var entry = acl[i]
        if (entry.id.toString() === userID.toString()) {
          return callback(null, entry)
        }
      }
      return callback('Unable to find userID match in firm object ACL.')
    }
  })
}

/**
 * Runs an access control check against an engagement object and returns the result.
 * @param {ObjectId} id       - The model ObjectId
 * @param {ObjectId} userID   - The userID to check against the object's acl.
 * @param {Function} callback -
 */
const engagementCheck = (id, userID, callback) => {
  debug('Running Engagement access check ...')
  if (_.isNull(id) || _.isUndefined(id)) {
    return callback('Access Control model ID is missing.')
  }
  if (_.isNull(userID) || _.isUndefined(userID)) {
    return callback('Access Control user ID is missing.')
  }
  if (_.isNull(callback) || _.isUndefined(callback)) {
    return callback('Access Control callback function is missing.')
  }

  var objID = (typeof id === 'string') ? ObjectId(id) : id // Utility.castToObjectId(id)
  Models.Auvenir.Engagement.findOne({ _id: objID }, (err, oneEngagement) => {
    if (err) {
      error({ err })
      return callback('Error occured while attempting to query an engagement ID (' + objID + ')')
    }

    if (!oneEngagement) {
      return callback('Unable to find engagement object for given engagement ID (' + objID + ')')
    } else {
      var { acl } = oneEngagement
      for (var i = 0; i < acl.length; i++) {
        var entry = acl[i]
        if (entry.id.toString() === userID.toString()) {
          return callback(null, entry)
        }
      }
      return callback('Unable to find userID match in engagement object ACL.')
    }
  })
}

/**
 * Runs an access control check against a file object and returns the result.
 * @param {ObjectId} id       - The model ObjectId
 * @param {ObjectId} userID   - The userID to check against the object's acl.
 * @param {Function} callback -
 */
const fileCheck = (id, userID, callback) => {
  debug('Running File access check ...')
  if (_.isNull(id) || _.isUndefined(id)) {
    return callback('Access Control model ID is missing.')
  }
  if (_.isNull(userID) || _.isUndefined(userID)) {
    return callback('Access Control user ID is missing.')
  }
  if (_.isNull(callback) || _.isUndefined(callback)) {
    return callback('Access Control callback function is missing.')
  }

  var objID = Utility.castToObjectId(id)
  async.waterfall([
    (cbk) => {
      debug('Step 1: Grabbing the file object')
      Models.Auvenir.File.findOne({ _id: objID }, (err, oneFile) => {
        if (err) {
          cbk(err)
        } else {
          cbk(null, oneFile)
        }
      })
    },
    (file, cbk) => {
      debug('Step 2: Grabbing the business object that owns the file')
      Models.Auvenir.Business.findOne({ files: file._id }, (err, oneBusiness) => {
        if (err) {
          cbk(err)
        } else {
          cbk(null, file, oneBusiness)
        }
      })
    },
    (file, business, cbk) => {
      debug('Step 3: Grabbing the engagement object that owns the file')
      Models.Auvenir.Engagement.findOne({ files: file._id }, (err, oneEngagement) => {
        if (err) {
          cbk(err)
        } else {
          cbk(null, file, business, oneEngagement)
        }
      })
    }
  ], (err, file, business, engagement) => {
    if (err) {
      error(`ERROR: Retrieving the objects for analysis.`, { err })
      callback('Error occured while retrieving objects for access analysis.')
    } else {
      let result = []
      if (file) {
        let { acl } = file
        for (let i = 0; i < acl.length; i++) {
          let entry = acl[i]
          if (entry.id.toString() === userID.toString()) {
            result.push({ file: entry })
            break
          }
        }
      }
      if (business) {
        let { acl } = business
        for (let i = 0; i < acl.length; i++) {
          let entry = acl[i]
          if (entry.id.toString() === userID.toString()) {
            result.push({ business: entry })
            break
          }
        }
        result.push({ business: null })
      }
      if (engagement) {
        let { acl } = engagement
        for (let i = 0; i < acl.length; i++) {
          let entry = acl[i]
          if (entry.id.toString() === userID.toString()) {
            result.push({ engagement: entry })
            break
          }
        }
        result.push({ engagement: null })
      }
      callback(null, result)
    }
  })
}

// TODO - add TODO accessControl Check HERE

module.exports = {
  user: userCheck,
  business: businessCheck,
  firm: firmCheck,
  engagement: engagementCheck,
  // request: requestCheck,
  file: fileCheck
}
