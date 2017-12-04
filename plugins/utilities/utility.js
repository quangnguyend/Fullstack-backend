'use strict'

const AWS = require('aws-sdk')
AWS.config.loadFromPath('/server/certs/aws-config.json')
const appConfig = require('../../config')
const ObjectId = require('mongodb').ObjectID
const Sanitize = require('google-caja-sanitizer').sanitize
const bCrypt = require('bcrypt-nodejs')
const async = require('async')
const EmailSender = require('../email-sender/email-sender')
const Inspector = require('../inspector/inspector')
const Code = require('./code')
const Access = require('./accessControls')
const Models = require('../../models')
const crypto = require('crypto')
const _ = require('lodash')

// var useragent = require('useragent')

const initLogger = require('../logger/logger').init
const {info, warn, error} = initLogger(__filename)

// Log For client side events

var log
if (typeof window !== 'undefined' && window.log) {
  log = window.log
} else {
  log = console.log // eslint-disable-line no-console
}

var Utility = {

  SESSION_LENGTH: 60 * 60000 * 1, // 1 Hour For security requirement.

  USER_STATUS: {'ACTIVE': 0, 'ONBOARDING': 1, 'PENDING': 2, 'WAITLIST': 3, 'LOCKED': 4, 'UNKNOWN': 5, 'INACTIVE': 6},

  ALPHANUMERIC: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',

  REGEX: {
    email: /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i,
    crud: /^[cud]+$/i,
    phone: /^\+?[1-9]\d{1,14}$/,
    unitNumber: /^\d+$/,
    streetAddress: /^\s*\S+(?:\s+\S+)*$/,
    postalCode: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
    country: /^[a-zA-Z]+(?:[\s-][a-zA-Z]+)*$/,
    city: /^[a-zA-Z]+(?:[\s-][a-zA-Z]+)*$/,
    stateProvince: /^[a-zA-Z]+(?:[\s-][a-zA-Z]+)*$/,
    noSelect: /^(?!Select).*$/,
    alphanumeric: /^[A-Za-z0-9]*$/,
    imageFormat: /.(?:jpe?g|png|gif)$/,
    name: /^[A-Za-z_. ]*$/,
    url: /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/
  },

  /**
   * This function is responsible for converting an id to a JSON object
   * @class Utility
   * @memberof Utility
   * @name Utility.castToObjectId
   * @param {ObjectID} id
   * @returns an ID
   */
  castToObjectId: function (id) {
    if (typeof id === 'string') {
      return ObjectId(id)
    } else if (typeof id === 'object') {
      return id
    } else {
      return null
    }
  },

  /**
   * Pass on to the correct data retrieval depending on the audit type.
   * @class Utility
   * @memberof Utility
   * @name Utility.retrieveEngagementInfo
   * @param data {id}
   * @param {Function} callback
   * @returns a callback to the server with a code and message
   */
  retrieveEngagementInfo: function (data, callback) {
    info('Retrieve Engagement Info, checking type')

    var result = {
      engagementInfo: null,
      activities: []
    }

    function checkACL (cbk) {
      Access.engagement(data.id, data.userID, (err, success) => {
        if (err) {
          return cbk(err)
        }

        cbk(null)
      })
    }

    function getEngagement (cbk) {
      Models.Auvenir.Engagement.findOne({ _id: data.id, 'acl.id': data.userID, 'acl.status': { $in: ['ACTIVE', 'INVITED'] } }, function (err, engagement) {
        if (err) {
          return cbk(err)
        }

        engagement.fetchAdditionalInfo((err, engagementInfo) => {
          if (err) {
            return cbk(err)
          }

          cbk(err, engagementInfo)
        })
      })
    }

    function getActivities (engagementInfo, cbk) {
      Models.Auvenir.Activity.find({ engagementID: data.id })
        .sort({timestamp: -1})
        .populate({path: 'userID', select: 'firstName lastName email profilePicture _id'})
        .exec(function (err, activities) {
          if (err) {
            return cbk(err)
          }

          cbk(null, { engagementInfo, activities })
        })
    }

    async.waterfall([checkACL, getEngagement, getActivities], (err, retrievedInfo) => {
      if (err) {
        error({err})
        return callback({code: 1, msg: 'There was an error while retrieving Engagement Informations.'})
      }

      let { engagementInfo, activities } = retrievedInfo
      result.engagementInfo = engagementInfo
      result.activities = activities

      return callback(null, { code: 0, result: result })
    })
  },

  /**
   * Verify the access status of the user and callback the appropriate UtilFunction
   * @class Utility
   * @memberof Utility
   * @name Utility.hasApplicationAccess
   * @param {string}    status
   * @param {Function}  callback
   * @returns a callback to the server with a code and message
   */
  hasApplicationAccess: function (status, callback) {
    info('Analyzing user status')
    switch (status) {
      case 'PENDING':
        callback({code: Utility.USER_STATUS.PENDING, msg: 'Your account is pending approval'})
        break
      case 'LOCKED':
        callback({code: Utility.USER_STATUS.LOCKED, msg: 'Your account is locked'})
        break
      case 'WAIT-LIST':
        callback({code: Utility.USER_STATUS.WAITLIST, msg: 'Your account is on the wait list'})
        break
      case 'ACTIVE':
        callback({code: Utility.USER_STATUS.ACTIVE})
        break
      case 'INACTIVE':
        callback({code: Utility.USER_STATUS.INACTIVE, msg: 'Your account is deactivated'})
        break
      case 'ONBOARDING':
        callback({code: Utility.USER_STATUS.ONBOARDING})
        break
      default:
        callback({code: Utility.USER_STATUS.UNKNOWN, msg: 'Unknown account status'})
    }
  },

  /**
   * Retrieve user in the databse based on a valid email
   * @class Utility
   * @memberof Utility
   * @name Utility.findUserAccount
   * @param {string}  email
   * @param {Function} callback
   * @returns a callback to the server with a code and message
   */
  findUserAccount: function (email, callback) {
    info('Finding user account for ' + email)

    if (!email || (typeof email !== 'string')) {
      callback({code: 301, msg: 'Invalid parameters for account creation'})
      return
    }

    if (!Utility.isEmailValid(email)) {
      callback({code: 303, msg: 'Invalid email'})
      return
    }

    Models.Auvenir.User.findOne({email: email}, function (err, oneUser) {
      if (err) {
        callback({code: 23, msg: 'Error finding user'})
        return
      } else {
        callback(null, oneUser)
      }
    })
  },

  /**
   * Retrieve engagement in the db based on a valid email and the acl access.
   * @class Utility
   * @memberof Utility
   * @name Utility.findEngagement
   * @param {any} email
   * @param {any} callback
   */
  findEngagement: function (email, callback) {
    info(`Finding engagementID for user ${email}`)

    if (!email || (typeof email !== 'string')) {
      callback({code: 301, msg: 'Invalid parameters for account creation'})
      return
    }

    if (!Utility.isEmailValid(email)) {
      callback({code: 303, msg: 'Invalid email'})
      return
    }

    Models.Auvenir.User.findOne({ email: email }, (err, oneUser) => {
      if (err) {
        callback({ code: 23, msg: `Error finding user ${email}` })
        return
      } else {
        let userID = oneUser._id

        Models.Auvenir.Engagement.findByAclUser({ role: 'CLIENT', id: userID }, (err, engagements) => {
          if (err) {
            callback({ code: 23, msg: `Error finding engagement for user ${email}` })
            return
          }

          callback(null, engagements)
        })
      }
    })
  },

  /**
   * Gather all information available for the passed email
   * @class Utility
   * @memberof Utility
   * @name Utility.scrapeUserData
   * @param {Object}   data
   * @param {Function} callback
   * @returns a callback to the server with a code and message
   */
  scrapeUserData: function (data, callback) {
    info('Scraping email data for ' + data.email)

    if (!data.email || (typeof data.email !== 'string')) {
      callback({code: 301, msg: 'Invalid parameters for account creation'})
      return
    }

    if (!Utility.isEmailValid(data.email)) {
      callback({code: 303, msg: 'Invalid email'})
      return
    }

    var lestrade = new Inspector()
    lestrade.retrieveData(data.email, function (err, intel) {
      if (err) {
        error({err})
        callback(err)
      } else {
        var userData = {}
        userData.email = data.email
        userData.firstName = (intel && intel.person && intel.person.name && intel.person.name.first) ? intel.person.name.first : ''
        userData.lastName = (intel && intel.person && intel.person.name && intel.person.name.last) ? intel.person.name.last : ''
        userData.jobTitle = (intel && intel.person && intel.person.jobTitle) ? intel.person.jobTitle : ''
        userData.phone = ''

        var businessData = {}
        businessData.name = (intel && intel.company && intel.company.name) ? intel.company.name : ''
        businessData.websiteURL = (intel && intel.company && intel.company.url) ? intel.company.url : ''
        businessData.phone = (intel && intel.company && intel.company.phone) ? intel.company.phone : ''
        businessData.logo = (intel && intel.company && intel.company.logo) ? intel.company.logo : ''

        var addr = {
          streetAddress: (intel && intel.company && intel.company.address) ? (intel.company.address.streetNumber + ' ' + intel.company.address.streetName) : '',
          unitNumber: (intel && intel.company && intel.company.address && intel.company.address.unitNumber) ? intel.company.address.unitNumber : '',
          city: (intel && intel.company && intel.company.address && intel.company.address.city) ? intel.company.address.city : '',
          stateProvince: (intel && intel.company && intel.company.address && intel.company.address.state) ? intel.company.address.state : '',
          postalCode: (intel && intel.company && intel.company.address && intel.company.address.postalCode) ? intel.company.address.postalCode : '',
          country: (intel && intel.company && intel.company.address && intel.company.address.country) ? intel.company.address.country : ''
        }
        businessData.addresses = [addr]

        var result = {
          user: userData,
          business: businessData
        }
        callback(null, result)
      }
    })
  },

  /**
   * Create a new user account & business OR firm account
   * after scraping all the information with Inspector()
   * @class Utility
   * @memberof Utility
   * @name Utility.createUserAccount
   * @param {Object}   data
   * @param {Function} callback
   * @returns a callback to the server with a code and message
   */
  createUserAccount: function (data, callback) {
    info('Creating new user account for ' + data.email)
    const { firstName, lastName, email, type, phone, jobTitle, status } = data

    if (!email || (!_.isString(email))) {
      return callback({code: 301, msg: 'Invalid parameters for account creation'})
    }

    if (!Utility.isEmailValid(email)) {
      return callback({code: 303, msg: 'Invalid email'})
    }

    if (!(type === 'AUDITOR' || type === 'CLIENT' || type === 'ADMIN')) {
      return callback({code: 302, msg: 'Invalid portal type'})
    }

    Models.Auvenir.User.findOne({email}, (err, oneUser) => {
      if (err) {
        return callback({code: 23, msg: 'Error finding user'})
      }

      if (oneUser) {
        return callback({code: 24, msg: 'User already exists'})
      } else {
        const lestrade = new Inspector()

        lestrade.retrieveData(email, (err, intel) => {
          if (err) {
            warn({err})
          }

          let userData = { email, type, phone }
          if (firstName) {
            userData.firstName = firstName
          } else {
            userData.firstName = (intel && intel.person && intel.person.name && intel.person.name.first) ? intel.person.name.first : ''
          }

          if (lastName) {
            userData.lastName = lastName
          } else {
            userData.lastName = (intel && intel.person && intel.person.name && intel.person.name.last) ? intel.person.name.last : ''
          }

          if (jobTitle) {
            userData.jobTitle = jobTitle
          } else {
            userData.jobTitle = (intel && intel.person && intel.person.jobTitle) ? intel.person.jobTitle : ''
          }

          if (type === 'AUDITOR') {
            userData.status = 'WAIT-LIST'
          } else if (type === 'CLIENT') {
            userData.status = status || 'WAIT-LIST'
          } else if (type === 'ADMIN') {
            userData.status = status || 'ONBOARDING'
          } else {
            return callback({code: 302, msg: 'Invalid portal acl injection'})
          }

          Utility.createUser(userData, function (err, newUser) {
            if (err) {
              return callback({ code: 24, msg: err })
            }

            if (newUser.type === 'ADMIN') {
              let business = { name: 'Auvenir', acl: { id: newUser._id, admin: true }}

              Models.Auvenir.Business.findOne({ name: business.name }, (err, auvenir) => {
                if (err) {
                  return callback({code: 24, msg: 'Error detected creating firm'})
                }

                if (auvenir) {
                  return callback(null, { user: newUser, business: auvenir })
                }

                Utility.createBusiness(business, (err, newAuvenir) => {
                  if (err) {
                    return callback({code: 24, msg: err})
                  }
                  info(`Auvenir ADMIN user ${email} & Auvenir business are created.`)
                  return callback(null, { user: newUser, business: newAuvenir })
                })
              })
            } else if (newUser.type === 'AUDITOR') {
              let firm = {}
              firm.acl = [{ id: newUser._id, admin: true }]
              firm.name = (intel && intel.company && intel.company.name) ? intel.company.name : ''
              firm.phone = (intel && intel.company && intel.company.phone) ? intel.company.phone : ''
              firm.logo = (intel && intel.company && intel.company.logo) ? intel.company.logo : ''

              Utility.createFirm(firm, function (err, newFirm) {
                if (err) {
                  callback({code: 24, msg: 'Error detected creating firm'})
                } else {
                  info('User Account created')
                  callback(null, {user: newUser, firm: newFirm})
                }
              })
            } else {
              let json = {}
              json.acl = [{ id: newUser._id, admin: false }]
              json.name = (intel && intel.company && intel.company.name) ? intel.company.name : ''
              json.website = (intel && intel.company && intel.company.url) ? intel.company.url : ''
              json.phone = (intel && intel.company && intel.company.phone) ? intel.company.phone : ''

              var addr = {
                streetAddress: (intel && intel.company && intel.company.address) ? (intel.company.address.streetNumber + ' ' + intel.company.address.streetName) : '',
                unit: (intel && intel.company && intel.company.address && intel.company.address.unitNumber) ? intel.company.address.unitNumber : '',
                city: (intel && intel.company && intel.company.address && intel.company.address.city) ? intel.company.address.city : '',
                stateProvince: (intel && intel.company && intel.company.address && intel.company.address.state) ? intel.company.address.state : '',
                postalCode: (intel && intel.company && intel.company.address && intel.company.address.postalCode) ? intel.company.address.postalCode : '',
                country: (intel && intel.company && intel.company.address && intel.company.address.country) ? intel.company.address.country : ''
              }

              json.address = addr
              json.logo = (intel && intel.company && intel.company.logo) ? intel.company.logo : ''
              if (data.clientCompanyInfo !== undefined) {
                json.legalNameChanged = (data.clientCompanyInfo.legalNameChanged) ? data.clientCompanyInfo.legalNameChanged : false
                json.previousLegalName = (data.clientCompanyInfo.legalName) ? data.clientCompanyInfo.previousLegalName : ''
                json.publiclyListed = (data.clientCompanyInfo.publiclyListed) ? data.clientCompanyInfo.publiclyListed : false
                json.overseasOps = (data.clientCompanyInfo.overseas) ? data.clientCompanyInfo.overseas : false
                json.parentStakeholders = (data.clientCompanyInfo.stackOwnerDetails) ? data.clientCompanyInfo.stackOwnerDetails : ''
                json.name = (data.clientCompanyInfo.legalName) ? data.clientCompanyInfo.legalName : json.name
                json.accountingFramework = (data.clientCompanyInfo.accountFrame) ? data.clientCompanyInfo.accountFrame : ''
                json.industry = (data.clientCompanyInfo.industry) ? data.clientCompanyInfo.industry : ''
              }
              info('Creating new business for ' + newUser.email)
              Utility.createBusiness(json, function (err, newBusiness) {
                if (err) {
                  callback({code: 24, msg: 'Error detected creating business'})
                } else {
                  info('User Account created')
                  callback(null, {user: newUser, business: newBusiness})
                }
              })
            }
          })
        })
      }
    })
  },

  /**
   * Adds userID to the ACL of any given model with query and aclOption.
   * @class Utility
   * @memberof Utility
   * @name Utility.addUserToACL
   * @param {ObjectID} userID
   * @param {String}   model
   * @param {JSON}     aclOption
   * @param {JSON}     query
   * @param {Function} callback
   * @returns a callback to the server with a code and message
   */
  addUserToACL: function (userID, model, aclOption, queryForModel, callback) {
    if (!queryForModel) {
      warn('Couldnt query the database. Something\'s wrong with the engagementID')
      return callback({code: 24, msg: 'Need to include query'})
    }
    if (!userID) {
      warn('Need to include a user id to add to engagement')
      return callback({code: 24, msg: 'Need to include an user id'})
    }

    let newACL = aclOption
    newACL.id = userID

    if (Models.Auvenir[model]) {
      Models.Auvenir[model].findOneAndUpdate(queryForModel, { $push: { 'acl': newACL } }, { new: true }, (err, updatedObj) => {
        if (err) {
          error({ err })
          return callback(err)
        }

        info(`Successfully added user ${userID} to existing ${model} ${queryForModel}`)
        return callback(null, updatedObj)
      })
    } else {
      return callback({code: 25, msg: `Invalid Model: ${model}` })
    }
  },

  /**
   * Responsible for creating a new Activity
   *
   * @class Utility
   * @memberOf Utility
   * @name Utility.createActivity
   * @param {Object} userID - required
   * @param {Object} engagementID - optional
   * @param {String} typeCrud - required
   * @param {String} typeActivity - required
   * @param {Object} original - required
   * @param {Object} updated - optional
   * @param {Function} callback - optional
   */
  createActivity: function (userID, engagementID, operation, type, original, updated, callback) {
    info('Creating activity ...')

    if (typeof callback !== 'function') callback = function () {}

    if (!userID) {
      warn('Activity Log Creation Failed')
      callback({code: Code.ERROR_CREATE_ACTIVITY, msg: 'userID is null'})
      return
    }

    if (!engagementID) {
      warn('Activity Log Creation Failed')
      callback({code: Code.ERROR_CREATE_ACTIVITY, msg: 'engagementID is null'})
    }

    if (!operation) {
      warn('Activity Log Creation Failed')
      callback({code: Code.ERROR_CREATE_ACTIVITY, msg: 'operation is null'})
      return
    }

    if (!type) {
      warn('Activity Log Creation Failed')
      callback({code: Code.ERROR_CREATE_ACTIVITY, msg: 'type is null'})
      return
    }

    var originalFields = {}
    var updatedFields = {}

    if (original.constructor && original.constructor.name === 'model') {
      original = original.toObject()
    }
    if (updated.constructor && updated.constructor.name === 'model') {
      // Convert to object to get rid of mongoose methods...
      updated = updated.toObject()
    }

    // remove auth information
    if (updated.hasOwnProperty('auth')) {
      delete updated.auth
    }

    if (original.hasOwnProperty('auth')) {
      delete original.auth
    }

    if (original._id) {
      // Setting up id for letting other class know what these changes are about.
      originalFields._id = original._id
    }
    if (original.name) {
      originalFields.name = original.name
    }
    if (updated) {
      for (var key in updated) {
        if (typeof updated[key] === 'object' && typeof original[key] === 'object') {
          updatedFields[key] = {}
          originalFields[key] = {}
          for (var subKey in updated[key]) {
            if (original[key].hasOwnProperty(subKey)) {
              if (updated[key][subKey] !== original[key][subKey]) {
                originalFields[key][subKey] = original[key][subKey]
                updatedFields[key][subKey] = updated[key][subKey]
              }
            } else {
              updatedFields[key][subKey] = updated[key][subKey]
            }
          }
        } else if (updated[key] instanceof Date && original[key] instanceof Date) {
          if (updated[key].getTime() !== original[key].getTime()) {
            updatedFields[key] = updated[key]
            originalFields[key] = original[key]
          }
        } else if (updated[key] !== original[key]) {
          updatedFields[key] = updated[key]
          originalFields[key] = original[key]
        }
      }
    } else {
      originalFields = original
    }

    var myActivity = new Models.Auvenir.Activity()
    myActivity.userID = userID
    myActivity.engagementID = engagementID
    myActivity.operation = operation.toUpperCase()
    myActivity.type = type
    myActivity.changes = {}
    myActivity.changes.original = originalFields
    myActivity.changes.updated = updatedFields
    if (myActivity.changes.updated) {
      myActivity.save(function (err) {
        if (err) {
          error('Error: Creating new Activity', {err})
          callback({code: Code.ERROR_CREATE_ACTIVITY, msg: 'Error occured during the saving of the activity log'})
        } else {
          info('Activity Log Entry created successfully')
          callback(null, { code: 0, result: {activity: myActivity} })
        }
      })
    }
  },

  /**
   * Responsible for creating only user instance
   * @class Utility
   * @memberof Utility
   * @name Utility.createUser
   * @param {Object}   data
   * @param {Function} callback
   * @returns a callback to the server with a code and message
   */
  createUser: function (data, callback) {
    info('Creating user ...')

    if (!data.type) {
      callback({ code: 1, msg: 'Missing user type' })
    }

    var myUser = new Models.Auvenir.User()
    myUser.type = data.type
    myUser.email = (data.email) ? data.email : ''
    myUser.firstName = (data.firstName) ? data.firstName : ''
    myUser.lastName = (data.lastName) ? data.lastName : ''
    myUser.phone = (data.phone) ? data.phone : ''
    myUser.jobTitle = (data.jobTitle) ? data.jobTitle : ''
    myUser.status = (data.status) ? data.status : 'ONBOARDING'

    Utility.generateUniqueAuthID(function (err, result) {
      if (err) {
        callback(err)
      } else {
        if (result.authID) {
          myUser.auth = { id: result.authID }

          myUser.save(function (err) {
            if (err) {
              error('Error: Creating new User', {err})
              callback({code: Code.ERROR_CREATE_USER, msg: 'Unable to create new user'})
            } else {
              info('User created successfully')
              callback(null, myUser)
            }
          })
        } else {
          warn('Generation of unique user authentication ID failed to return a value')
          callback({ code: 1, msg: 'Generation of unique user authentication ID failed to return a value' })
        }
      }
    })
  },

  /**
   * Used in order to generate a unique authentication ID for a User object.
   * This ID is independent of the document unique ID, and will be used for
   * identifying the user, instead of the email address or document ID. The
   * implementation only requires the callback parameter, but the second one
   * is used in the implementation to track the number of attempts to set a
   * unique value.
   * @class Utility
   * @memberof Utility
   * @name Utility.generateUniqueAuthID
   * @param {Function} callback
   * @param {Number}   attempts
   * @returns a callback to the server with a code and message
   */
  generateUniqueAuthID: function (callback, attempts) {
    info('Generating unique user authentication ID')

    // Check if we're running in the QA environment and return early the static auth ID if so
    if (appConfig.env === 'qa' && appConfig.integrations.qa.authID) {
      callback(null, { authID: appConfig.integrations.qa.authID })
      return
    }

    var MAX_ATTEMPTS = 4
    if (!attempts) {
      attempts = 1
    }

    if (attempts < MAX_ATTEMPTS) {
      var id = Utility.randomString(12, Utility.ALPHANUMERIC) + '-' + Utility.randomString(12, Utility.ALPHANUMERIC)

      Models.Auvenir.User.findOne({'auth.id': id}, function (err, oneUser) {
        if (err) {
          error('Error generating unique user authentication ID: ', {err})
          callback({ code: 1, msg: 'Error generating unique user authentication ID: ' + err })
        } else {
          if (oneUser) {
            Utility.generateUniqueAuthID(callback, attempts++)
          } else {
            callback(null, { authID: id })
          }
        }
      })
    } else {
      warn('Max attempts reached for generating unique user authentication ID')
      callback({ code: 1, msg: 'Max attempts reached for generating unique user authentication ID' })
    }
  },

  /**
   * Used in order to generate the developer credentials for a User object.
   * These credentials are unique across all other user accounts that have
   * developer api access.The implementation only requires the callback parameter,
   * but the second one is used in the implementation to track the number of
   * attempts to set a unique value.
   * @class Utility
   * @memberof Utility
   * @name Utility.generateDeveloperCreds
   * @param {Function} callback
   * @param {Number}   attempts
   * @returns a callback to the server with a code and message
   */
  generateDeveloperCreds: function (callback, attempts) {
    info('Generating unique developer credentials')

    // Check if we're running in the QA environment and return early the static developer key if so
    if (appConfig.env === 'qa' && appConfig.integrations.qa.apiKey) {
      callback(null, { apiKey: appConfig.integrations.qa.apiKey })
      return
    }

    var MAX_ATTEMPTS = 4

    if (!attempts) {
      attempts = 1
    }

    if (attempts < MAX_ATTEMPTS) {
      var id = Utility.randomString(12, Utility.ALPHANUMERIC) + '-' + Utility.randomString(12, Utility.ALPHANUMERIC)

      Models.Auvenir.User.findOne({'auth.developer.apiKey': id}, function (err, oneUser) {
        if (err) {
          error('Error generating unique developer credentials', {err})
          callback({ code: 1, msg: 'Error generating unique developer credentials' })
        } else {
          if (oneUser) {
            Utility.generateDeveloperCreds(callback, attempts++)
          } else {
            callback(null, { apiKey: id })
          }
        }
      })
    } else {
      warn('Max attempts reached for generating unique developer credentials')
      callback({ code: 1, msg: 'Max attempts reached for generating unique developer credentials' })
    }
  },

  /**
   * Responsible for creating a new business
   * @class Utility
   * @memberof Utility
   * @name Utility.createBusiness
   * @param {Object}   data
   * @param {Function} callback
   * @returns a callback to the server with a code and message
   *
   * TODO - use { acl, name, website ... } = data instead of data.acl
   */
  createBusiness: function (data, callback) {
    info('Creating business ...')

    var myBusiness = new Models.Auvenir.Business()
    myBusiness.acl = (data.acl) ? data.acl : []
    myBusiness.name = (data.name) ? data.name : 'Unknown'
    myBusiness.website = (data.website) ? data.website : ''
    myBusiness.industry = (data.industry) ? data.industry : ''
    myBusiness.logo = (data.logo) ? data.logo : ''
    myBusiness.accountingFramework = (data.framework) ? data.framework : ''
    myBusiness.fiscalYearEnd = (data.fiscalYear) ? data.fiscalYear : null

    if (data.address) {
      myBusiness.address = data.address
    }

    myBusiness.legalNameChanged = (data.legalNameChanged) ? data.legalNameChanged : false
    myBusiness.previousLegalName = (data.previousLegalName) ? data.previousLegalName : ''
    myBusiness.publiclyListed = (data.publiclyListed) ? data.publiclyListed : false
    myBusiness.overseasOps = (data.overseasOps) ? data.overseasOps : false
    myBusiness.parentStakeholders = (data.parentStakeholders) ? data.parentStakeholders : ''

    myBusiness.save(function (err, result) {
      if (err) {
        error('Error: Creating new Business', {err})
        callback({code: Code.ERROR_CREATE_BUSINESS, msg: 'Unable to create new business'})
      } else {
        info('Business created successfully')
        callback(null, myBusiness)
      }
    })
  },

  /**
   * Responsible for creating a new firm
   * @class Utility
   * @memberof Utility
   * @name Utility.createFirm
   * @param {Object}   data
   * @param {Function} callback
   * @returns a callback to the server with a code and message
   */
  createFirm: function (data, callback) {
    info('Creating firm ...')

    var myFirm = new Models.Auvenir.Firm()
    myFirm.acl = (data.acl) ? data.acl : []
    myFirm.name = (data.name) ? data.name : ' '
    myFirm.phone = (data.phone) ? data.phone : ''

    if (data.address) {
      myFirm.address = data.address
    }

    myFirm.logo = (data.logo) ? data.logo : ''
    myFirm.size = (data.size) ? data.size : ''
    myFirm.affiliated = (data.affiliated) ? data.affiliated : ''
    myFirm.affiliatedFirmName = (data.affiliatedFirmName) ? data.affiliatedFirmName : ''
    myFirm.logoDisplayAgreed = (data.logoDisplayAgreed) ? data.logoDisplayAgreed : false

    myFirm.save(function (err, result) {
      if (err) {
        error('ERROR: Creating new Firm', {err})
        callback({code: Code.ERROR_CREATE_FIRM, msg: 'Unable to create new firm'})
      } else {
        info('Firm created successfully')
        callback(null, myFirm)
      }
    })
  },

  /**
   * Responsible for updating a user's field
   * @class Utility
   * @memberof Utility
   * @name Utility.updateUser
   * @param {Object}   data
   * @param {ObjectID} currentUserID
   * @param {Function} callback
   * @returns a callback to the server with a code and message
   */
  updateUser: function (data, currentUserID, callback) {
    info('Updating User.')

    var json = {}
    if (data.timeZone) json.timeZone = data.timeZone
    if (data.language) json.language = data.language
    if (data.email) json.email = data.email
    if (data.firstName) json.firstName = Sanitize(data.firstName)
    if (data.lastName) json.lastName = Sanitize(data.lastName)
    if (data.phone) json.phone = Sanitize(data.phone)
    if (data.jobTitle) json.jobTitle = Sanitize(data.jobTitle)
    if (data.agreements) json.agreements = data.agreements
    if (data.status) {
      if (data.status === 'ACTIVE' || data.status === 'INACTIVE' || data.status === 'LOCKED' || data.status === 'PENDING' || data.status === 'WAIT-LIST' || data.status === 'ONBOARDING') {
        json.status = data.status
      }
    }
    if (data.auth) {
      json.auth = data.auth
    }
    var userID = Utility.castToObjectId(data.userID)

    if (!userID.equals(currentUserID)) {
      Models.Auvenir.User.findOne({_id: currentUserID}, function (err, oneUser) {
        if (err) {
          error({err})
          callback({code: Code.ERROR_GENERAL, msg: 'Error occurred while searching user in db.'})
        } else {
          if (oneUser.type.indexOf('ADMIN') !== -1) {
            if (Object.keys(json).length > 0) {
              Models.Auvenir.User.findOneAndUpdate({_id: data.userID}, {$set: json}, function (err, originalUser) {
                if (err) {
                  error({err})
                  callback({code: Code.ERROR_GENERAL, msg: 'Error occurred updating user info'})
                } else {
                  info('Update user fields: ' + Object.keys(json))
                  callback(null, { id: originalUser._id, user: originalUser, fields: json })
                }
              })
            } else {
              warn('No valid fields to update')
              callback({code: Code.ERROR_GENERAL, msg: 'No valid fields to update'})
            }
          } else {
            warn('Insufficient permissions to edit another user')
            callback({code: Code.ERROR_GENERAL, msg: 'Insufficient permissions to edit another user'})
          }
        }
      })
    } else {
      if (Object.keys(json).length > 0) {
        if (!json.agreements) {
          Models.Auvenir.User.findOneAndUpdate({_id: currentUserID}, {$set: json}, function (err, originalUser) {
            if (err) {
              error({err})
              callback({code: Code.GENERAL_ERROR, msg: 'Error occurred updating user info'})
            } else {
              info('Update user fields: ' + Object.keys(json))
              callback(null, { id: originalUser._id, user: originalUser, fields: json })
            }
          })
        } else {
          Models.Auvenir.User.findOne({ _id: currentUserID }, function (err, oneUser) {
            if (err) {
              error({err})
              return callback({code: Code.ERROR_GENERAL, msg: 'Error occurred while searching user in db.'})
            }

            json.agreements = oneUser.agreements.concat(json.agreements)
            oneUser.agreements = json.agreements
            oneUser.save((err) => {
              if (err) {
                return callback({code: Code.ERROR_GENERAL, msg: 'Error while saving the agreement.'})
              } else {
                return callback(null, { id: oneUser._id, user: oneUser, fields: json })
              }
            })
          })
        }
      } else {
        warn('No valid fields to update')
        callback({code: Code.ERROR_GENERAL, msg: 'No valid fields to update'})
      }
    }
  },

  /**
   * Responsible for updating the business model passed
   * @class Utility
   * @memberof Utility
   * @name Utility.updateBusiness
   * @param {Object}   data
   * @param {ObjectID} currentUserID
   * @param {Function} callback
   * @returns a callback to the server with a code and message
   */
  updateBusiness: function (data, currentUserID, callback) {
    info('Updating Business.')

    if (!currentUserID) {
      warn('Missing current user ID for access check')
      callback({code: Code.ERROR_GENERAL, msg: 'Missing current user ID for access check'})
      return
    }

    if (!data.businessID) {
      warn('Missing business ID')
      callback({code: Code.ERROR_GENERAL, msg: 'Missing business ID'})
      return
    }

    var json = {}
    if (data.name) json.name = data.name
    if (data.industry) json.industry = data.industry
    if (data.logo) json.logo = data.logo
    if (data.website) json.website = data.website
    if (data.address) json.address = data.address
    if (data.accountingFramework) json.accountingFramework = data.accountingFramework
    if (data.fiscalYearEnd) json.fiscalYearEnd = data.fiscalYearEnd
    if (data.legalNameChanged) json.legalNameChanged = data.legalNameChanged
    if (data.previousLegalName) json.previousLegalName = data.previousLegalName
    if (data.publiclyListed) json.publiclyListed = data.publiclyListed
    if (data.overseasOps) json.overseasOps = data.overseasOps
    if (data.parentStakeholders) json.parentStakeholders = data.parentStakeholders

    if (Object.keys(json).length > 0) {
      var query = {_id: data.businessID, 'acl': {$elemMatch: {id: currentUserID}}}
      Models.Auvenir.Business.findOneAndUpdate(query, {$set: json}, {new: true}, function (err, updatedBusiness) {
        if (err) {
          error({err})
          callback({code: Code.GENERAL_ERROR, msg: 'Error occurred updating business info'})
        } else {
          info('Update business fields: ' + Object.keys(json))
          callback(null, {fields: json})
        }
      })
    } else {
      info('No valid fields to update')
      callback({code: Code.ERROR_GENERAL, msg: 'No valid fields to update'})
    }
  },

   /**
   * Responsible for updating the business model passed
   * @class Utility
   * @memberof Utility
   * @name Utility.updateBusiness
   * @param {Object}   data
   * @param {ObjectID} currentUserID
   * @param {Function} callback
   * @returns a callback to the server with a code and message
   */
  updateFirm: function (data, currentUserID, callback) {
    info('Updating Firm.')

    if (!currentUserID) {
      warn('Missing current user ID for access check')
      callback({code: Code.ERROR_GENERAL, msg: 'Missing current user ID for access check'})
      return
    }

    if (!data.firmID) {
      warn('Missing firm ID')
      callback({code: Code.ERROR_GENERAL, msg: 'Missing business ID'})
      return
    }

    var json = {}

    if (data.name) json.name = data.name
    if (data.logo) json.logo = data.logo
    if (data.address) json.address = data.address
    if (data.size) json.size = data.size
    if (data.phone) json.phone = data.phone
    if (data.affiliated) json.affiliated = data.affiliated
    if (data.affiliatedFirmName) json.affiliatedFirmName = data.affiliatedFirmName
    if (data.logoDisplayAgreed) json.logoDisplayAgreed = data.logoDisplayAgreed
    if (data.acl) json.acl = [data.acl]

    if (Object.keys(json).length > 0) {
      var query = {_id: data.firmID, 'acl': {$elemMatch: {id: currentUserID}}}
      Models.Auvenir.Firm.findOneAndUpdate(query, {$set: json}, {new: true}, function (err, updatedFirm) {
        if (err) {
          error({err})
          callback({code: Code.GENERAL_ERROR, msg: 'Error occurred updating firm info'})
        } else {
          info('Update firm fields: ' + Object.keys(json))
          callback(null, {fields: json})
        }
      })
    } else {
      warn('No valid fields to update')
      callback({code: Code.ERROR_GENERAL, msg: 'No valid fields to update'})
    }
  },

  /**
   * Responsible for updating an engagement status & name.
   * @class Utility
   * @memberof Utility
   * @name Utility.updateEngagement
   * @param {Object}   data
   * @param {ObjectID} currentUserID
   * @param {Function} callback
   * @returns a callback to the server with a code and message
   */
  updateEngagement: function (data, callback) {
    const { currentUserID, engagementID, status, name } = data

    const fetchEngagement = (cbk) => {
      Models.Auvenir.Engagement.findOne({
        acl: {$elemMatch: {id: currentUserID}},
        _id: engagementID
      }, (err, engagement) => {
        if (err) {
          return cbk(err)
        }
        if (!engagement) {
          return cbk({code: 404, msg: `Cannot find engagement with id ${engagement}`})
        }

        cbk(null, {engagement})
      })
    }

    const updateEngagement = ({engagement}, cbk) => {
      if (status) {
        if (status === 'UNARCHIVED') {
          engagement.status = engagement.previousStatus
          engagement.previousStatus = 'ARCHIVED'
        } else {
          engagement.previousStatus = engagement.status
          engagement.status = status
        }
      }
      engagement.name = name || engagement.name

      engagement.save((err, engagement) => {
        cbk(err, {engagement})
      })
    }

    const fetchAdditionalInfo = ({engagement}, cbk) => {
      engagement.fetchAdditionalInfo((err, result) => {
        if (err) {
          return cbk(err)
        }
        const {acl, business, firm} = result
        const engagementObj = engagement.toJSON()
        engagementObj.acl = acl
        engagementObj.business = business
        engagementObj.firm = firm
        cbk(err, {engagement: engagementObj})
      })
    }

    async.waterfall([fetchEngagement, updateEngagement, fetchAdditionalInfo], (err, result) => {
      if (err) {
        if (err.code && err.msg) {
          return callback(err)
        }
        return callback({code: 500, msg: 'Cannot update engagement'})
      }

      callback({code: 0, result: result.engagement})
    })
  },

  /**
   * Responsible for sending out an email with template
   * @class Utility
   * @memberof Utility
   * @name Utility.sendEmail
   * @param {Object}   json
   * @param {Function} callback
   * @returns the callback to the server
   */
  sendEmail: function (emailInfo, callback) {
    info('Sending email via sendEmail..')

    for (var key in emailInfo) {
      if (emailInfo.hasOwnProperty(key)) {
        var val = emailInfo[key]
        if (val === '' || val === null) {
          warn('There is no value in the field: ' + key)
          callback({ code: 202, msg: 'Error on sending email.' })
        }
      }
    }
    var emailJSON
    if (emailInfo.status) { // using pre-made subject and body from email copy list
      emailJSON = EmailSender.build(emailInfo)
    } else if (emailInfo.subject) { // using manually entered subject and body text
      emailJSON = EmailSender.buildManual(emailInfo)
    } else {
      warn('Not a valid json object passed to send email.')
      callback({ code: 202, msg: 'Error on sending email.' })
    }

    EmailSender.sendEmail_mailer(emailJSON, function (err, result) {
      if (err) {
        callback(err)
      } else if (result) {
        callback(null, result)
      }
    })
  },

  /**
   * This function returns activities for specific engagement & user in Array.
   * @memberof Utility
   * @name Utility.getActivities
   * @param {JSON} data
   * @param {Function} callback
   * @return {Function} (err, Array)
   */
  getActivities: function (data, callback) {
    Models.Auvenir.Activity.find({engagementID: data.engagementID, userID: {$ne: data.userID}})
    .sort({timestamp: -1})
    .populate({path: 'userID', select: 'firstName lastName email profilePicture _id'})
    .exec(function (err, activities) {
      if (err) {
        error({err})
        callback({code: Code.ERROR_GENERAL, msg: 'Error getting activities'})
      } else {
        info('Got ' + activities.length + ' activities')
        callback(null, activities)
      }
    })
  },

  /**
   * Generates hash using bCrypt
   * @class Utility
   * @memberof Utility
   * @name Utility.createHash
   * @param {string} str
   * @returns a hash form of the string passed
   */
  createHash: function (str) {
    return bCrypt.hashSync(str, bCrypt.genSaltSync(10), null)
  },

  /**
   * Checks if passed string matched the encrypted version
   * @class Utility
   * @memberof Utility
   * @name Utility.createHash
   * @param {string} str
   * @returns a hash form of the string passed
   */
  checkHash: function (stored, passed) {
    try {
      return bCrypt.compareSync(stored, passed)
    } catch (err) {
      warn('checkHash', {err})
      return false
    }
  },

  /**
   * @class Utility
   * @memberof Utility
   * @name Utility.getAdminMapping
   * @param {Array} users
   * @param {Array} businesses
   * @param {Array} engagements
   * @returns {Array} result - Returns the array of businesses/engagements corresponding to each use
   */
  getAdminMapping: function (users, businesses, engagements) {
    var result = []

    for (var i = 0; i < users.length; i++) {
      var output = { user: users[i], businesses: [], engagements: [] }
      for (var j = 0; j < businesses.length; j++) {
        var b = businesses[j]
        var acl = b.acl
        for (var k = 0; k < acl.length; k++) {
          if (acl[k].type && acl[k].type.toLowerCase() === 'user' && acl[k].id.equals(users[i]._id)) {
            output.businesses.push(b)
            break
          }
        }
      }

      for (j = 0; j < engagements.length; j++) {
        var e = engagements[j]
        acl = e.acl
        for (k = 0; k < acl.length; k++) {
          if (acl[k].type && acl[k].type.toLowerCase() === 'user' && acl[k].id.equals(users[i]._id)) {
            output.engagements.push(e)
            break
          }
        }
      }
      result.push(output)
    }
    return result
  },

  /**
   * This function validates if it's a right mime type for our service.
   * list of mimeType : https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Complete_list_of_MIME_types
   * @class Utility
   * @memberof Utility
   * @name Utility.validateMimeType
   * @param {string} mime
   * @returns {boolean}
   */
  validateMimeType: function (mime) {
    info('Validating Mime Type')
    switch (mime) {
      case 'application/pdf':
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/vnd.ms-powerpoint':
      case 'application/vnd.oasis.opendocument.spreadsheet':
      case 'application/vnd.ms-excel':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'image/png':
      case 'image/bmp':
      case 'image/jpeg':
      case 'text/plain':
      case 'text/csv':
      case 'application/rtf':
      case 'text/sgml':
        return 'original'
      case 'application/vnd.google-apps.document':
      case 'application/vnd.google-apps.photo':
      case 'application/vnd.google-apps.presentation':
      case 'application/vnd.google-apps.spreadsheet':
        return 'google'
      default:
        return false
    }
  },

  /**
   * Regular Expression test for email validation
   * @class Utility
   * @memberof Utility
   * @name Utility.isEmailValid
   * @param {String} email The character set to be used
   * @return {Utility}
   */
  isEmailValid: function (email) {
    log('Verifying email')
    if (typeof email !== 'string') {
      return false
    }
    if (Utility.REGEX.email.test(email)) {
      log('Email verified')
      return true
    }
    return false
  },

  /**
   * Returns a random string generated of length 'length'
   * @class Utility
   * @memberof Utility
   * @name Utility.randomString
   * @param {Number} length
   * @param {string} chars
   * @returns a random string
   */
  randomString: function (length, chars) {
    var result = ''
    for (var i = length; i > 0; --i) {
      result += chars[Math.round(Math.random() * (chars.length - 1))]
    }
    return result
  },

  /**
   * Returns a cryptographically secure random string generated of length 'length'
   * Should be atleast 20 characters
   * @class Utility
   * @memberof Utility
   * @name Utility.secureRandomString
   * @param {Number} length
   * @param {string} chars
   * @returns a random string
   */
  secureRandomString: function (length) {
    return crypto.randomBytes(Math.ceil(length * 3 / 4))
      .toString('base64')   // convert to base64 format
      .slice(0, length)        // return required number of characters
      .replace(/\+/g, '0')  // replace '+' with '0'
      .replace(/\//g, '0') // replace '/' with '0'
  }

  /************************************************************
   * @QUICKBOOK RELATED FUNCTIONS
   *
   * These are here for future use so please don't delete them
   * We might want to have seperate file for Quickbook.
   *************************************************************/
   /**
   * This function is responsible for displaying the data, once access has been granted to the user.
   * @class Utility
   * @memberof Utility
   * @name Utility.sanitizeQuickBooksJSON
   * @param {Object}  glData - Data from the General Ledger that
   * @param {function} callback - The function that will be called when a result has occured
   *                              while loading the socket.io resource
   * @returns an array of General Ledger Transactions
   */
  // sanitizeQuickBooksJSON: function (glData) {
  //   var glTransactions = []
  //   var glSections = JSON.parse(glData).Rows.Row
  //   for (var i = 0; i < glSections.length; i++) {
  //     var section = glSections[i]
  //     if (section.Header !== undefined && section.Header.ColData !== undefined) {
  //       if (section.Header.ColData[0].value === 'Checking') {
  //         var checkingRows = section.Rows.Row
  //         for (var j = 0; j < checkingRows.length; j++) {
  //           var cols = checkingRows[j].ColData

  //           if (cols[0].value === 'Beginning Balance') {
  //             info('Beginning Balanace For Checking: ' + cols[7].value)
  //           } else {
  //             var jsonData = {
  //               dateProcessed: cols[0].value,
  //               transactionType: cols[1].value,
  //               serialNumber: cols[2].value,
  //               name: cols[3].value,
  //               description: cols[4].value,
  //               section: cols[5].value,
  //               amount: cols[6].value,
  //               balance: cols[7].value
  //             }
  //             info(jsonData)
  //             glTransactions.push(jsonData)
  //           }
  //         }
  //       }
  //     }
  //   }
  //   return glTransactions
  // },

  /**
   * Remove Accounting Data for the given engagementID from the Auvenir DB.
   * For the given engagement, entries in the Line, Header, Ledger and
   * ChartAccount are removed.
   * @class Utility
   * @memberof Utility
   * @name Utility.removeAccountingData
   * @param  {ObjectId}   engID  - the Id of the current engagement
   * @param  {Function} callback - the callback function
   * @return {}                  - nothing
   */
  // removeAccountingData: function (engID, callback) {
  //   Models.Quickbooks.Line.remove({engagementID: engID}, function (err, removeLines) {
  //     if (err) {
  //       callback({code: 444, msg: 'Error removing Lines from Auvenir database!'})
  //     } else {
  //       Models.Quickbooks.Header.remove({engagementID: engID}, function (err, removeHeader) {
  //         if (err) {
  //           callback({code: 444, msg: 'Error removing Headers from Auvenir database!'})
  //         } else {
  //           Models.Quickbooks.Ledger.remove({engagementID: engID}, function (err, removeLedger) {
  //             if (err) {
  //               callback({code: 444, msg: 'Error removing Ledger from Auvenir database!'})
  //             } else {
  //               Models.Quickbooks.ChartAccount.remove({engagementID: engID}, function (err, removeChart) {
  //                 if (err) {
  //                   callback({code: 444, msg: 'Error removing Chart of Accounts from Auvenir database!'})
  //                 } else {
  //                   callback(null, {code: 0})
  //                 }
  //               })
  //             }
  //           })
  //         }
  //       })
  //     }
  //   })
  // },

  /**
   * Responsible for creating a bank statement
   * @class Utility
   * @memberof Utility
   * @name Utility.createBankStatement
   * @param {Object}   data
   * @param {Function} callback
   * @returns a callback to the server with a code and message
   */
  // createBankStatement: function (data, callback) {
  //   info('Creating Bank Statement ...')

  //   var myBS = new Models.Quickbooks.BankStatement()
  //   myBS.acl = (data.acl) ? data.acl : []
  //   myBS.fileID = data.fileID
  //   myBS.bank = data.bank
  //   myBS.accountNumber = data.accountNumber
  //   myBS.openingBalance = parseFloat(data.openingBalance.replace('$', '').replace(',', ''))
  //   myBS.closingBalance = parseFloat(data.closingBalance.replace('$', '').replace(',', ''))
  //   myBS.openingDate = data.openingDate
  //   myBS.closingDate = data.closingDate
  //   myBS.engagementID = data.engagementID

  //   myBS.save(function (err) {
  //     if (err) {
  //       error('Error: Creating new Bank Statement', {err})
  //       callback({code: Code.GENERAL_ERROR, msg: 'Error creating new bank statement'})
  //     } else {
  //       info('Bank Statement created successfully')
  //       callback(null, myBS)
  //     }
  //   })
  // },

  /**
   * Responsible for creating a new transaction
   * @class Utility
   * @memberof Utility
   * @name Utility.createTransaction
   * @param {Object}   data
   * @param {Function} callback
   * @returns a callback to the server with a code and message
   */
  // createTransaction: function (data, callback) {
  //   info('Creating Transaction ...')
  //   // firmID, clientID, or both
  //   var myTransaction = new Models.Quickbooks.Transaction()
  //   myTransaction.acl = (data.acl) ? data.acl : []
  //   myTransaction.type = data.Type
  //   myTransaction.amount = data.amount
  //   myTransaction.flowType = data.flowType
  //   myTransaction.dateProcessed = data.dateProcessed
  //   myTransaction.description = data.description
  //   myTransaction.sourceType = data.sourceType
  //   myTransaction.reference = data.reference
  //   myTransaction.identifier = data.serialNumber
  //   myTransaction.engagementID = data.engagementID

  //   myTransaction.save(function (err) {
  //     if (err) {
  //       error('Error: Creating new transaction', {err})
  //       callback({code: Code.GENERAL_ERROR, msg: 'Unable to create new transaction'}, null)
  //     } else {
  //       info('Transaction created successfully')
  //       callback(null, myTransaction)
  //     }
  //   })
  // },

  /**
   * Responsible for updating a bank
   * @class Utility
   * @memberof Utility
   * @name Utility.updateBank
   * @param {Object}   data
   * @param {ObjectID} currentUserID
   * @param {Function} callback
   * @returns a callback to the server with a code and message
   */
  // updateBank: function (data, currentUserID, callback) {
  //   info('Updating Bank.')

  //   if (!currentUserID) {
  //     warn('Missing current user ID for access check')
  //     callback({code: Code.ERROR_GENERAL, msg: 'Missing current user ID for access check'})
  //     return
  //   }

  //   if (!data.engagementID) {
  //     warn('Missing engagement ID')
  //     callback({code: Code.NO_VALID_FIELDS_ERROR, msg: 'Missing engagement ID'})
  //     return
  //   }

  //   var objID = Utility.castToObjectId(data.engagementID)
  //   if (objID === null) {
  //     warn('Unable to cast to engagement ObjectId')
  //     callback({code: Code.ERROR_GENERAL, msg: 'Unable to cast to engagement ObjectId'})
  //     return
  //   }

  //   var bank = data.banks[0]
  //   var json = {}
  //   if (bank.name !== undefined) json.name = bank.name
  //   if (bank.address !== undefined) json.address = bank.address
  //   if (bank.city !== undefined) json.city = bank.city
  //   if (bank.provinceState !== undefined) json.provinceState = bank.provinceState
  //   if (bank.country !== undefined) json.country = bank.country

  //   if (bank.keyContact) {
  //     var contact = {}
  //     if (bank.keyContact.firstName !== undefined) contact.firstName = bank.keyContact.firstName
  //     if (bank.keyContact.lastName !== undefined) contact.lastName = bank.keyContact.lastName
  //     if (bank.keyContact.phone !== undefined) contact.phone = bank.keyContact.phone
  //     if (bank.keyContact.email !== undefined) contact.email = bank.keyContact.email
  //     if (bank.keyContact.contactReq !== undefined) contact.contactReq = bank.keyContact.contactReq

  //     if (Object.keys(contact).length > 0) {
  //       json.keyContact = contact
  //     }
  //   }

  //   if (Object.keys(json).length > 0) {
  //     var query = {
  //       engagementID: objID,
  //       'acl': {$elemMatch: {id: currentUserID}}
  //     }
  //     Models.Quickbooks.Bank.findOneAndUpdate(query, {$set: json}, {upsert: true, new: true}, function (err, updatedbank) {
  //       if (err) {
  //         error({err})
  //         callback({code: Code.ERROR_GENERAL, msg: 'Error occurred updating bank info'})
  //       } else {
  //         info('Update bank fields: ' + Object.keys(json))
  //         callback(null, {bank: updatedbank, fields: json})
  //       }
  //     })
  //   } else {
  //     warn('No valid fields to update')
  //     callback({code: Code.ERROR_GENERAL, msg: 'No valid fields to update'})
  //   }
  // },

  /**
   * Responsible for updating an outlier
   * @class Utility
   * @memberof Utility
   * @name Utility.updateOutlier
   * @param {Object}   data
   * @param {ObjectID} currentUserID
   * @param {Function} callback
   * @returns a callback to the server with a code and message
   */
  // updateOutlier: function (data, currentUserID, callback) {
  //   info('Updating Outlier.')

  //   if (!currentUserID) {
  //     warn('Missing current user ID for access check')
  //     callback({code: Code.ERROR_GENERAL, msg: 'Missing current user ID for access check'})
  //     return
  //   }

  //   if (!data.outlierID) {
  //     warn('Missing outlier ID')
  //     callback({code: Code.ERROR_GENERAL, msg: 'Missing outlier ID in request'})
  //     return
  //   }

  //   if (!data.engagementID) {
  //     warn('Missing engagement ID')
  //     callback({code: Code.NO_VALID_FIELDS_ERROR, msg: 'Missing engagement ID'})
  //     return
  //   }

  //   var objID2 = Utility.castToObjectId(data.outlierID)
  //   if (objID2 === null) {
  //     warn('Unable to cast to outlier ObjectId')
  //     callback({code: Code.ERROR_GENERAL, msg: 'Unable to cast to outlier ObjectId'})
  //     return
  //   }

  //   var objID = Utility.castToObjectId(data.engagementID)
  //   if (objID === null) {
  //     warn('Unable to cast to engagement ObjectId')
  //     callback({code: Code.ERROR_GENERAL, msg: 'Unable to cast to engagement ObjectId'})
  //     return
  //   }

  //   var bank = data.banks[0]
  //   var json = {}
  //   if (bank.name !== undefined) json.name = bank.name
  //   if (bank.address !== undefined) json.address = bank.address
  //   if (bank.city !== undefined) json.city = bank.city
  //   if (bank.provinceState !== undefined) json.provinceState = bank.provinceState
  //   if (bank.country !== undefined) json.country = bank.country

  //   if (bank.keyContact) {
  //     var contact = {}
  //     if (bank.keyContact.firstName !== undefined) contact.firstName = bank.keyContact.firstName
  //     if (bank.keyContact.lastName !== undefined) contact.lastName = bank.keyContact.lastName
  //     if (bank.keyContact.phone !== undefined) contact.phone = bank.keyContact.phone
  //     if (bank.keyContact.email !== undefined) contact.email = bank.keyContact.email
  //     if (bank.keyContact.contactReq !== undefined) contact.contactReq = bank.keyContact.contactReq

  //     if (Object.keys(contact).length > 0) {
  //       json.keyContact = contact
  //     }
  //   }

  //   if (Object.keys(json).length > 0) {
  //     var query = {
  //       _id: objID2,
  //       engagementID: objID,
  //       'acl': {$elemMatch: {id: currentUserID}}
  //     }
  //     Models.Quickbooks.Bank.findOneAndUpdate(query, {$set: json}, {new: true}, function (err, updatedbank) {
  //       if (err) {
  //         error({err})
  //         callback({code: Code.ERROR_GENERAL, msg: 'Error occurred updating bank info'})
  //       } else {
  //         info('Update bank fields: ' + Object.keys(json))
  //         callback(null, {fields: json})
  //       }
  //     })
  //   } else {
  //     warn('No valid fields to update')
  //     callback({code: Code.ERROR_GENERAL, msg: 'No valid fields to update'})
  //   }
  // },

  /************************************************************
   * @MOBILE API RELATED FUNCTIONS
   *
   * These are here for future use so please don't delete them
   * We might want to have seperate file for Mobile api.
   *************************************************************/

   /**
   * This function is responsible for verifying
   * @class Utility
   * @memberof Utility
   * @name Utility.idqVerification
   * @param {ObjectID} id
   * @returns a callback to the server with a code and message
   */

  // idqVerification: function (oneUser, callback) {
  //   info('Running IDQ Login ...')

  //   var pushMessageToken = Utility.secureRandomString(64)
  //   var expiryTime = Date.now() + Utility.SESSION_LENGTH
  //   oneUser.auth.mobile.flag = false
  //   oneUser.auth.mobile.push.token = pushMessageToken
  //   oneUser.auth.mobile.push.expires = expiryTime

  //   // Push message token is generated and is used to validate the device when its used to generate access token
  //   // @ref Check-authentication
  //   oneUser.save(function (err) {
  //     if (err) {
  //       error('Error occured while assigning api pushMessage token', {err})
  //       callback({ code: Code.db.ERROR_OP_SAVE, msg: 'Error occured while assigning pushMessage token' })
  //     } else {
  //       info(oneUser.email + ' assigned pushMessage Token ' + pushMessageToken)
  //       IDQ.push(oneUser.auth.mobile.id, 'Mobile Login Notification', pushMessageToken + ' is the push message token attempting to login via API', function (err, pushResult) {
  //         if (err) {
  //           callback(err)
  //         } else {
  //           info(pushResult)
  //           IDQ.pauth(pushResult.push_token, null, function (err, authResult) {
  //             if (err) {
  //               callback(err)
  //             } else {
  //               info(authResult)
  //               var POLL_TIMEOUT = 90 // in seconds
  //               var startTime = new Date().getTime()
  //               var pollCookies = authResult.cookies
  //               var pollCallback = function (err, pollResult) {
  //                 if (err) {
  //                   callback(err)
  //                 } else {
  //                   info(pollResult)
  //                   IDQ.pauth(pushResult.push_token, pollCookies, function (err, authCResult) {
  //                     if (err) {
  //                       callback(err)
  //                     } else {
  //                       info(authCResult)
  //                       IDQ.token(authCResult.code, function (err, tokenResult) {
  //                         if (err) {
  //                           callback(err)
  //                         } else {
  //                           IDQ.user(tokenResult.access_token, function (err, userResult) {
  //                             if (err) {
  //                               callback(err)
  //                             } else {
  //                               info(userResult)
  //                               if (oneUser.email === userResult.email && oneUser.auth.mobile.id === userResult.username) {
  //                                 callback(null, { code: 0, msg: 'match found' })
  //                               } else {
  //                                 callback(null, { code: 1, msg: 'user data retrieved did not match' })
  //                               }
  //                             }
  //                           })
  //                         }
  //                       })
  //                     }
  //                   })
  //                 }
  //               }

  //               info('\nPstatus Polling ...')

  //               var poll = function (cookies) {
  //                 IDQ.pstatus(pollCookies, function (err, result) {
  //                   if (err) {
  //                     pollCallback(err)
  //                   } else {
  //                     var currentTime = new Date().getTime()
  //                     var time = currentTime - startTime
  //                     info((time / 1000) + ' sec')
  //                     if ((time / 1000) > POLL_TIMEOUT) {
  //                       error('Pstatus poll timed out.')
  //                       pollCallback({code: 333, msg: 'Timed Out'})
  //                     } else if (result.responseCode === '2') {
  //                       error('Pstatus poll returned an error')
  //                       pollCallback({ code: 1, msg: 'Polling Error Occured' })
  //                     } else if (result.responseCode === '1') {
  //                       info('Poll completed')
  //                       pollCallback(null, result)
  //                     } else {
  //                       setTimeout(poll, 2000)
  //                     }
  //                   }
  //                 })
  //               }
  //               poll(pollCookies)
  //             }
  //           })
  //         }
  //       })
  //     }
  //   })
  // },
}

module.exports = Utility
