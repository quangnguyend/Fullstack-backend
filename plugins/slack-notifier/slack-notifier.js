var req = require('request')
var appConfig = require('../../config')
var initLogger = require('../logger/logger').init
const {info, warn, error} = initLogger(__filename)

var SlackNotifier = {
  APP_NAME: appConfig.integrations.slack.APP_NAME,
  URL: appConfig.integrations.slack.URL,
  channel: {
    GENERAL: appConfig.integrations.slack.channel.GENERAL,
    SIGNUP_AUDITOR: appConfig.integrations.slack.channel.SIGNUP_AUDITOR,
    SIGNUP_USER: appConfig.integrations.slack.channel.SIGNUP_USER
  },

  /**
   * Generic notification function for when a developer wants to trigger a generic notification.
   * @param message: String
   * @param channel: SlackNotifier.channel.<option>
   * @param callback: function
   */
  notify: function (channel, message, callback) {
    if (message === null) {
      warn('Message needs to be defined for the noticification')
      callback({code: 1, msg: 'Message needs to be defined for the notification'})
      return
    } else {
      if (message === '') {
        warn('Notification message is empty')
        callback({code: 2, msg: 'Notification message is empty'})
        return
      }
    }

    if (channel === null) {
      warn('Channel needs to be defined for the notification')
      callback({ code: 3, msg: 'Channel needs to be defined for the notification' })
      return
    } else {
      if (!(channel in SlackNotifier.channel)) {
        warn('Channel ' + channel + 'is not supported')
        callback({ code: 4, msg: 'Channel ' + channel + 'is not supported' })
        return
      }
    }

    if (typeof callback !== 'function') {
      warn('Callback parameter needs to be a function')
      callback({ code: 5, msg: 'Callback parameter needs to be a function' })
      return
    }

    var options = {}
    options.text = message
    options.channel = channel

    req.post(SlackNotifier.URL, { body: JSON.stringify(options) }, function (err, res, body) {
      if (err) {
        error({err})
        callback({err: 6, msg: 'Error occured posting slack notification'})
      } else {
        if (body === 'ok') {
          info('Slack Notification successful')
          callback(null, {code: 0, msg: 'Slack Notification Successful!'})
        } else {
          warn(body)
          callback({code: 333, msg: body})
        }
      }
    })
  },

  /**
   * Generic notification function for when a user signs up for a system.
   * @param channel: SlackNotifier.channel.<option>
   * @param callback: function
   */
  notify_Signup: function (channel, user, business, callback) {
    if (channel === null) {
      warn('Channel needs to be defined for the notification')
      callback({ code: 3, msg: 'Channel needs to be defined for the notification' })
      return
    } else {
      if (!(channel in SlackNotifier.channel)) {
        warn('Channel ' + channel + 'is not supported')
        callback({ code: 4, msg: 'Channel ' + channel + 'is not supported' })
        return
      }
    }

    if (typeof callback !== 'function') {
      warn('Callback parameter needs to be a function')
      callback({ code: 5, msg: 'Callback parameter needs to be a function' })
      return
    }

    var msg = ''
    if (channel === SlackNotifier.channel.SIGNUP_USER) {
      msg = `A new user has signed up for ${SlackNotifier.APP_NAME}\nNo further action is needed.\n\n`
    } else if (channel === SlackNotifier.channel.SIGNUP_AUDITOR) {
      msg = `A new auditor has signed up for ${SlackNotifier.APP_NAME}\n Please log onto the admin portal and validate the new user account.\n\n`
    }

    msg += '\nEnvironment: ' + appConfig.env

    if (user !== null) {
      msg += 'First Name: ' + (user.firstName || 'unknown')
      msg += '\nLast Name: ' + (user.lastName || 'unknown')
      msg += '\nTitle: ' + (user.jobTitle || 'unknown')
      msg += '\nE-mail: ' + (user.email || 'unknown')
      msg += '\nPhone: ' + (user.phone || 'unknown')
      msg += '\n\n'
    }

    if (business !== null) {
      msg += 'Name: ' + (business.name || 'unknown')
      msg += '\nWebsite: ' + (business.website || 'unknown')
      msg += '\nPhone: ' + (business.phone || 'unknown')
      msg += '\nAddress: ' + JSON.stringify(business.address)
      msg += '\n\n'
    }

    msg += '==================================================================================\n\n'

    SlackNotifier.notify(channel, msg, callback)
  }
}

module.exports = SlackNotifier
