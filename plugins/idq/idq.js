var request = require('request')
var myJar = request.jar()
var initLogger = require('../logger/logger').init
var appConfig = require('../../config')
const {info, warn, error} = initLogger(__filename)

var ALPHANUMERIC = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

// 144.217.8.26 for auvenir.idquanta.com
var reg_url = appConfig.integrations.idq.regUrl
var log_url = appConfig.integrations.idq.logUrl

var settings = { id: '', secret: '', callback: '' }
var auth = { user: appConfig.integrations.idq.user, pass: appConfig.integrations.idq.pass, sendImmediately: false }

settings.id = appConfig.integrations.idq.keys.id
settings.secret = appConfig.integrations.idq.keys.secret
settings.callback = appConfig.integrations.idq.keys.callback

/**
 * Returns true or false based on a regular expression check for an email format.
 * @param email: String
 */
var isEmail = function (email) {
  var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i
  return re.test(email)
}

/**
 * Generates a random string based on the values that are passed in.
 * @param length: Number
 * @param chars: String
 */
var randomString = function (length, chars) {
  var result = ''
  for (var i = length; i > 0; --i) {
    result += chars[Math.round(Math.random() * (chars.length - 1))]
  }
  return result
}

/**
 * In order to get around deficiencies that are in the inbay API, we are going to
 * manually attempt to parse the result and catch any error states that occur.
 * Will return null if it was unable to parse successfully.
 */
var toJSON = function (param) {
  var result = null

  if (typeof param === 'object') {
    result = param
  } else if (typeof param === 'string') {
    try {
      result = JSON.parse(param)
    } catch (err) {
      error('Unable to parse into a JSON object', {err, param})
    }
  } else {
    warn('Unexpected type value received (' + (typeof param) + ')')
  }
  return result
}

var IDQ = {

  MAX_DEVICES: 1,

  code: {
    OK: 0,
    IDQ_ID_MISSING: 1,
    CALLBACK_MISSING: 2,
    COMMUNICATION_ERROR: 3,
    USER_DATA_MISSING: 4,
    EMAIL_MISSING: 5,
    EMAIL_INVALID: 6,
    FIRSTNAME_MISSING: 7,
    LASTNAME_MISSING: 8,
    MAX_DEVICE_MISSING: 9,
    MAX_DEVICE_INVALID: 10,
    IDQ_ERROR_MESSAGE: 11,
    UNKNOWN_RESPONSE_TYPE: 12,
    TITLE_MISSING: 13,
    MESSAGE_MISSING: 14,
    HTTP_STATUS_INVALID: 15,
    PUSH_TOKEN_MISSING: 16,
    HTTP_STATUS_307: 17,
    CODE_MISSING: 18,
    ACCESS_TOKEN_MISSING: 19
  },

  /**
   * Using an IDQ id, we retrieve user information and return the information.
   * @param idqID: String
   * @param callback: function
   */
  getUser: function (idqID, callback) {
    info('IDQ: getUser')

    if (idqID === undefined || typeof idqID !== 'string') {
      warn('IDQ ID was not provided')
      callback({code: IDQ.code.IDQ_ID_MISSING, msg: 'IDQ ID was not provided'})
      return
    }

    if (callback === undefined || typeof callback !== 'function') {
      warn('Callback was not provided')
      callback({code: IDQ.code.CALLBACK_MISSING, msg: 'Callback was not provided'})
      return
    }

    var customURL = reg_url + '/users/' + idqID
    var options = { auth: auth }

    request.get(customURL, options, function (err, resp, body) {
      if (err) {
        error({err})
        callback({code: IDQ.code.COMMUNICATION_ERROR, msg: 'Error occured communicating with IDQ server'})
      } else {
        callback(null, body)
      }
    })
  },

  /**
   * De-register User
  */
  deleteUser: function (idqID, callback) {
    info('IDQ: deleteUser')

    if (idqID === undefined || typeof idqID !== 'string') {
      warn('IDQ ID was not provided')
      callback({code: IDQ.code.IDQ_ID_MISSING, msg: 'IDQ ID was not provided'})
      return
    }

    if (callback === undefined || typeof callback !== 'function') {
      warn('Callback was not provided')
      callback({code: IDQ.code.CALLBACK_MISSING, msg: 'Callback was not provided'})
      return
    }

    var customURL = reg_url + '/users/' + idqID
    var options = { auth: auth }

    request.delete(customURL, options, function (err, resp, body) {
      if (err) {
        error({err})
        callback({code: IDQ.code.COMMUNICATION_ERROR, msg: 'Error occured communicating with IDQ server'})
      } else {
        callback(null, body)
      }
    })
  },

  /**
   *
   */
  getDevices: function (idqID, callback) {
    if (idqID === undefined || typeof idqID !== 'string') {
      warn('IDQ ID was not provided')
      callback({code: IDQ.code.IDQ_ID_MISSING, msg: 'IDQ ID was not provided'})
      return
    }

    if (callback === undefined || typeof callback !== 'function') {
      warn('Callback was not provided')
      callback({code: IDQ.code.CALLBACK_MISSING, msg: 'Callback was not provided'})
      return
    }

    var customURL = reg_url + '/users/' + idqID + '/Profiles.Query'
    var options = { auth: auth }

    request.get(customURL, options, function (err, resp, body) {
      if (err) {
        error({err})
        callback({code: IDQ.code.COMMUNICATION_ERROR, msg: 'Error occured communicating with IDQ server'})
      } else {
        callback(null, body)
      }
    })
  },

  /**
   * Creates a user in the IDQ database and returns and IDQ ID that needs to stored
   * against that users specific email address.
   * @param data: JSON
   * @param callback: function
   */
  createUser: function (data, callback) {
    if (data === undefined || typeof data !== 'object') {
      warn('User data was not provided')
      callback({code: IDQ.code.USER_DATA_MISSING, msg: 'User data was not provided'})
      return
    }

    if (callback === undefined || typeof callback !== 'function') {
      warn('Callback was not provided')
      callback({code: IDQ.code.CALLBACK_MISSING, msg: 'Callback was not provided'})
      return
    }

    if (data.email === undefined || typeof data.email !== 'string') {
      warn('Missing email address in user data')
      callback({code: IDQ.code.EMAIL_MISSING, msg: 'Missing email address in user data'})
      return
    } else {
      if (!isEmail(data.email)) {
        warn('Email address was invalid')
        callback({code: IDQ.code.EMAIL_INVALID, msg: 'Email address was invalid'})
        return
      }
    }

    if (data.maxDevices === undefined || typeof data.maxDevices !== 'number') {
      warn('Missing max devices in user data')
      callback({code: IDQ.code.MAX_DEVICE_MISSING, msg: 'Missing max devices in user data'})
      return
    } else {
      if (data.maxDevices < IDQ.MAX_DEVICES) {
        warn('Must provide a valid number for max devices')
        callback({code: IDQ.CODE.MAX_DEVICE_INVALID, msg: 'Must provide a valid number for max devices'})
        return
      }
    }

    var customURL = reg_url + '/users/'
    var options = {
      auth: auth,
      json: {
        email: data.email,
        firstName: data.firstName || 'First name',
        lastName: data.lastName || 'Last name',
        maxDevices: data.maxDevices
      }
    }

    request.post(customURL, options, function (err, resp, body) {
      if (err) {
        error({err})
        callback({code: IDQ.code.COMMUNICATION_ERROR, msg: 'Error occured communicating with IDQ server'})
      } else {
        var result = toJSON(body)
        if (!result) {
          callback({ code: IDQ.code.UNKNOWN_RESPONSE_TYPE, msg: 'Unknown data type response from IDQ'})
          return
        }

        if (result.code !== undefined) {
          warn('IDQ error message received for ' + data.email + result)
          callback({code: IDQ.code.IDQ_ERROR_MESSAGE, msg: result.message})
        } else {
          callback(null, result)
        }
      }
    })
  },

  /**
   * Using an IDQ id, we ask IDQ to give us a token in order for the user to register a device.
   * @param id: String
   * @param callback: function
   */
  createInvitationToken: function (idqID, callback) {
    info('IDQ: createInvitationToken')

    if (idqID === undefined || typeof idqID !== 'string') {
      warn('IDQ ID was not provided')
      callback({code: IDQ.code.IDQ_ID_MISSING, msg: 'IDQ ID was not provided'})
      return
    }

    if (callback === undefined || typeof callback !== 'function') {
      warn('Callback was not provided')
      callback({code: IDQ.code.CALLBACK_MISSING, msg: 'Callback was not provided'})
      return
    }

    var customURL = reg_url + '/users/' + idqID + '/Invitations.Create'
    var options = { auth: auth }

    request.post(customURL, options, function (err, resp, body) {
      if (err) {
        error({err})
        callback({code: IDQ.code.COMMUNICATION_ERROR, msg: 'Error occured communicating with IDQ server'})
      } else {
        var result = toJSON(body)
        if (!result) {
          callback({ code: IDQ.code.UNKNOWN_RESPONSE_TYPE, msg: 'Unknown data type response from IDQ'})
          return
        }
        callback(null, result)
        info(result)
      }
    })
  },

  /**
   *
   *
   */
  push: function (idqID, title, message, callback) {
    info('IDQ: push')

    if (idqID === undefined || typeof idqID !== 'string') {
      warn('IDQ ID was not provided')
      callback({code: IDQ.code.IDQ_ID_MISSING, msg: 'IDQ ID was not provided'})
      return
    }

    if (title === undefined || typeof title !== 'string') {
      warn('Title for push notification was not provided')
      callback({code: IDQ.code.TITLE_MISSING, msg: 'Title for push notification was not provided'})
      return
    }

    if (message === undefined || typeof message !== 'string') {
      warn('Message content for push notification was not provided')
      callback({code: IDQ.code.MESSAGE_MISSING, msg: 'Message content for push notification was not provided'})
      return
    }

    if (callback === undefined || typeof callback !== 'function') {
      warn('Callback was not provided')
      callback({code: IDQ.code.CALLBACK_MISSING, msg: 'Callback was not provided'})
      return
    }

    var uniquePushID = randomString(32, ALPHANUMERIC)
    var customURL = log_url + '/push'
    var options = {
      form: {
        client_id: settings.id,
        client_secret: settings.secret,
        target: idqID,
        message: message,
        title: title,
        push_id: uniquePushID
      }
    }
    request.post(customURL, options, function (err, resp, body) {
      if (err) {
        error({err})
        callback({code: IDQ.code.COMMUNICATION_ERROR, msg: 'Error occured communicating with IDQ server'})
      } else {
        info('\x1b[36m\x1b[47m***Response***\x1b[0m')
        var cookie_string = myJar.getCookieString(customURL) // "key1=value1; key2=value2; ..."
        var cookies = myJar.getCookies(customURL)
        info(`COOKIE STUFF ${cookie_string} ${cookies}`)

        if (resp.statusCode !== 200) {
          error(resp.statusCode, body)
          callback({ code: IDQ.code.HTTP_STATUS_INVALID, msg: body.error })
        } else {
          info(resp.headers)
          var result = toJSON(body)
          if (!result) {
            callback({ code: IDQ.code.UNKNOWN_RESPONSE_TYPE, msg: 'Unknown data type response from IDQ'})
            return
          }
          callback(null, result)
        }
      }
    })
  },

  /**
   * Handles two scenarios. 1) To send the push request. 2) To get the code.
   * @param token: String
   * @param cookie: ????
   */
  pauth: function (token, cookies, callback) {
    info('IDQ: pauth')

    if (token === undefined || typeof token !== 'string') {
      warn('Push Token was not provided')
      callback({code: IDQ.code.PUSH_TOKEN_MISSING, msg: 'Push Token was not provided'})
      return
    }

    if (callback === undefined || typeof callback !== 'function') {
      warn('Callback was not provided')
      callback({code: IDQ.code.CALLBACK_MISSING, msg: 'Callback was not provided'})
      return
    }

    var state = randomString(16, ALPHANUMERIC)
    var customURL = log_url + '/pauth'

    myJar = request.jar()
    if (cookies && cookies !== null) {
      info('Cookies present: ' + cookies.length)

      for (var i = 0; i < cookies.length; i++) {
        var str = cookies[i].toString()
        warn('Adding cookie: ' + str)
        myJar.setCookie(str, customURL)
      }
    }

    var options = {
      qs: {
        client_id: settings.id,
        push_token: token,
        response_type: 'code',
        redirect_uri: settings.callback,
        state: state,
        scope: 'email'
      },
      jar: myJar
    }

    info('')
    info('Current Cookies: ' + myJar.getCookieString(customURL))
    info('')
    info(options)
    info('')
    info('')
    info('URL')
    info(customURL)
    request.get(customURL, options, function (err, resp, body) {
      if (err) {
        error({err})
        callback({code: IDQ.code.COMMUNICATION_ERROR, msg: 'Error occured communicating with IDQ server'})
      } else {
        info('\x1b[36m\x1b[47m***Response***\x1b[0m')
        var cookie_string = myJar.getCookieString(customURL) // "key1=value1; key2=value2; ..."
        var cookies = myJar.getCookies(customURL)
        info('COOKIE STUFF')
        info(cookie_string)
        info(cookies)

        if (resp.statusCode === 200) {
          info(resp.statusCode + ' Sent')
          info(resp.headers)
          info(resp.request.uri.href)

          var href = resp.request.uri.href
          if (href.indexOf(settings.callback) === 0) {
            var qs = resp.request.uri.query // code=fecd770ff0db3cad65b6b7702b2008f0&state=Drd8PXgRbsxPwH6K
            var queries = qs.split('&')

            var code = null
            var qState = null

            for (var i = 0; i < queries.length; i++) {
              var arr = queries[i].split('=')
              var key = arr[0]
              var value = arr[1]

              if (key === 'code') {
                code = value
              }
              if (key === 'state') {
                qState = value
              }
            }

            if (code === null || qState === null) {
              warn('The response queries did not find code and state')
              callback({code: 1, msg: 'The response queries did not find code and state'})
            } else if (qState !== state) {
              warn('The query response did not find a state match')
              warn(state + ' - ' + qState)
              callback({code: 1, msg: 'The query response did not find a state match'})
            } else {
              callback(null, { code: code })
            }
          } else {
            callback(null, { code: IDQ.code.OK, state: state, cookies: cookies})
          }
        } else if (resp.statusCode === 302) {
          warn(resp.statusCode)
          warn('Data received?')
          info(resp)
          callback(null, {code: IDQ.code.OK })
        } else if (resp.statusCode === 307) {
          warn(resp.statusCode)
          warn('Redirect to Login Page registered for the application if the seesion cookie is invalid?')
          callback({ code: IDQ.code.HTTP_STATUS_307, msg: 'Redirect to Login Page registered for the application if the seesion cookie is invalid?'})
        } else {
          error(resp.statusCode + ' Invalid Request')
          callback({ code: IDQ.code.HTTP_STATUS_INVALID, msg: 'Invalid Request' })
        }
      }
    })
  },

  /**
   * TODO Still need to figure out how we are going to get the cookie into the request.
   * @param cookie: ????
   */
  pstatus: function (cookies, callback) {
    info('IDQ: pstatus')

    if (callback === undefined || typeof callback !== 'function') {
      warn('Callback was not provided')
      callback({code: IDQ.code.CALLBACK_MISSING, msg: 'Callback was not provided'})
      return
    }

    var customURL = log_url + '/pstatus'
    if (cookies && cookies !== null) {
      for (var i = 0; i < cookies.length; i++) {
        var str = cookies[i].toString()
        warn('Adding cookie: ' + str)
        myJar.setCookie(str, customURL)
      }
    }

    var options = { jar: myJar }

    info('Current Cookies: ' + myJar.getCookieString(customURL))

    request.get(customURL, options, function (err, resp, body) {
      if (err) {
        error({err})
        callback({code: IDQ.code.COMMUNICATION_ERROR, msg: 'Error occured communicating with IDQ server'})
      } else {
        info('\x1b[36m\x1b[47m***Response***\x1b[0m')
        var cookie_string = myJar.getCookieString(customURL) // "key1=value1; key2=value2; ..."
        var cookies = myJar.getCookies(customURL)
        info(cookie_string)
        info(cookies)
        info(resp.headers)
        if (resp.statusCode !== 200) {
          error(resp.statusCode, body)
          callback({ code: IDQ.code.HTTP_STATUS_INVALID, msg: 'Unknown IDQ response status'})
        } else {
          info(body)
          callback(null, { responseCode: body })
        }
      }
    })
  },

  /**
   * Uses a code in order to generate an access_token for the user information.
   * @param code: String
   */
  token: function (code, callback) {
    info('IDQ: token')

    if (code === undefined || typeof code !== 'string') {
      warn('Code was not provided')
      callback({code: IDQ.code.CODE_MISSING, msg: 'Code was not provided'})
      return
    }

    if (callback === undefined || typeof callback !== 'function') {
      warn('Callback was not provided')
      callback({code: IDQ.code.CALLBACK_MISSING, msg: 'Callback was not provided'})
      return
    }

    var customURL = log_url + '/token'
    var options = {
      form: {
        client_id: settings.id,
        client_secret: settings.secret,
        code: code,
        redirect_uri: settings.callback,
        grant_type: 'authorization_code'
      }
    }

    request.post(customURL, options, function (err, resp, body) {
      if (err) {
        error({err})
        callback({code: IDQ.code.COMMUNICATION_ERROR, msg: 'Error occured communicating with IDQ server'})
      } else {
        if (resp.statusCode !== 200) {
          error(resp.statusCode, body)
          callback({ code: IDQ.code.HTTP_STATUS_INVALID, msg: 'Invalid idq http status code response'})
        } else {
          var result = toJSON(body)
          if (!result) {
            callback({ code: IDQ.code.UNKNOWN_RESPONSE_TYPE, msg: 'Unknown data type response from IDQ'})
            return
          }
          callback(null, result)
        }
      }
    })
  },

  /**
   * Uses a IDQ generated access token in order to retrieve user data from their system.
   * @param token: String
   */
  user: function (accessToken, callback) {
    info('IDQ: user')

    if (accessToken === undefined || typeof accessToken !== 'string') {
      warn('Access Token was not provided')
      callback({code: IDQ.code.ACCESS_TOKEN_MISSING, msg: 'Access Token was not provided'})
      return
    }

    if (callback === undefined || typeof callback !== 'function') {
      warn('Callback was not provided')
      callback({code: IDQ.code.CALLBACK_MISSING, msg: 'Callback was not provided'})
      return
    }

    var customURL = log_url + '/user'
    var options = {
      qs: {
        access_token: accessToken
      }
    }

    request.get(customURL, options, function (err, resp, body) {
      if (err) {
        error({err})
        callback({code: IDQ.code.COMMUNICATION_ERROR, msg: 'Error occured communicating with IDQ server'})
      } else {
        if (resp.statusCode !== 200) {
          error(resp.statusCode, body)
          callback({ code: IDQ.code.HTTP_STATUS_INVALID, msg: 'Unknown idq http status code response' })
        } else {
          var result = toJSON(body)
          if (!result) {
            callback({ code: IDQ.code.UNKNOWN_RESPONSE_TYPE, msg: 'Unknown data type response from IDQ'})
            return
          }
          callback(null, result)
        }
      }
    })
  }
}

module.exports = IDQ
