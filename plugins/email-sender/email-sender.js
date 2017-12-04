// Required classes
var fs = require('fs')
var nodemailer = require('nodemailer')
var AWS = require('aws-sdk')
AWS.config.loadFromPath('/server/certs/aws-config.json')
var ses = new AWS.SES({apiVersion: '2010-12-01'})
var emailCopy = require('./templates/email_copy_list')
var appConfig = require('../../config')
var initLogger = require('../logger/logger').init
const {info, warn, error} = initLogger(__filename)

/**
 * Email Plugin.
 * This plugin is responsible for configuring email and sending it.
 * It will only be used through Utility.sendEmail() which will be configuring the email appropriately and
 * to use EmailSender across the application where utility.js is called.
 *
 * It uses emailCopy to use pre-made subjects and body copies.
 */

var EmailSender = {
  AUVENIR: 'Auvenir',
  SERVICE: appConfig.integrations.nodemailer.service,
  AUTH_USER: appConfig.integrations.nodemailer.auth.user,
  AUTH_PASS: appConfig.integrations.nodemailer.auth.pass,
  DEFAULT_FROM: appConfig.integrations.nodemailer.from,

  /**
   * Regex check to validate email address.
   * @name     EmailSender.isEmailValid
   * @memberOf EmailSender
   * @param    {String} email
   * @returns  {Boolean} regex test result
   */
  isEmailValid: function (email) {
    var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i
    return re.test(email)
  },

  /**
   * This function replaces parameters in parametised string to values.
   * @name     EmailSender.applyCustomValue
   * @memberOf EmailSender
   * @param    {String} paramString
   * @param    {JSON} customValues : { key:value }
   * @returns  {String} paramString
   */
  applyCustomValue: function (paramString, customValues) {
    info('Applying custom values.')
    var keys = Object.keys(customValues)
    info('\nkey: ' + keys)
    for (var i = 0; i < keys.length; i++) {
      // Need to replace all token
      paramString = paramString.split('%' + keys[i] + '%').join(customValues[keys[i]])
    }
    return paramString
  },

  /**
   * This function calls template 'default.json' and returns basic content structure.
   * @name     EmailSender.setTemplate
   * @memberOf EmailSender
   * @param    {string} template
   * @returns  {JSON} contentJSON
   */
  setTemplate: function (status) {
    info('Setting Email Template')
    var contentJSON = { html: { htmlHeader: '', htmlBody: '', htmlFooter: '' },
      plain: '' }
    var template
    if (status) {
      try {
        var buf = fs.readFileSync(`${__dirname}/templates/default.json`, 'utf8')
        if (buf !== '') {
          template = JSON.parse(buf)
          if (typeof status === 'string') {
            switch (status) {
              case 'sendErrorMsg':
              case 'waitlist':
              case 'pending':
                contentJSON.html.htmlHeader = template.htmlHeader
                break
              case 'active':
              case 'onboarding':
              case 'confirmEmail':
              case 'verified':
              case 'clientFilesReady':
              case 'notifyClient':
              case 'sendSuggestion':
              case 'sendEngagementInvite':
                contentJSON.html.htmlHeader = template.htmlHeader
                contentJSON.html.htmlFooter = template.htmlFooter
                break
              default:
                warn('Not a valid status to set template')
                break
            }
          } else {
            warn('Invalid type of template.')
          }
        }
        return contentJSON
      } catch (e) {
        if (e.code === 'ENOENT') {
          error('Email not Supported Template', {err: e})
          return null
        } else {
          error('Error on setting Template:', {err: e})
          return null
        }
      }
    } else {
      warn('No status is given. return empty template.')
      return contentJSON
    }
  },

  /**
   * This function brings subject copy from email copy list and returns subject string.
   * @name     EmailSender.setSubject
   * @memberOf EmailSender
   * @param    {String} copyName
   * @returns  {String} subject
   */
  setSubject: function (copyName) {
    info('Getting email subject..')
    var subject = ''
    if (copyName) {
      var keys = Object.keys(emailCopy)
      var counter = 0
      for (var i = 0; i < keys.length; i++) {
        if (copyName === keys[i]) {
          subject = emailCopy[keys[i]].subject
          counter++
        }
      }
      if (counter === 0) {
        warn('There is no subject for the type. Check email copy list.')
        return null
      } else {
        return subject
      }
    } else {
      warn(copyName + 'must be given.')
      return null
    }
  },

  /**
   * This function sets subject manually.
   * @name     EmailSender.setSubjectManual
   * @memberOf EmailSender
   * @param    {String} subjectStr
   * @returns  {String} subject
   */
  setSubjectManual: function (subjectStr) {
    var subject = ''
    if (!subjectStr) {
      warn('Subject is not given.')
      return 'No Subject'
    } else {
      subject = subjectStr.toString()
      return subject
    }
  },

  /**
   * This function brings content copy from email copy list and returns JSON.
   * @name     EmailSender.setContent
   * @memberOf EmailSender
   * @param    {String} copyName
   * @returns  {JSON} bodyJSON
   */
  setContent: function (copyName) {
    info('Getting copy of email body..')
    var bodyJSON = { html: '', plain: '' }
    if (copyName) {
      var keys = Object.keys(emailCopy)
      var counter = 0
      for (var i = 0; i < keys.length; i++) {
        if (copyName === keys[i]) {
          bodyJSON.html = emailCopy[keys[i]].content.html
          bodyJSON.plain = emailCopy[keys[i]].content.plain
          counter++
        }
      }
      if (counter === 0) {
        warn("Couldn't find an htmlBody and plain. Check email copy list.")
        return null
      } else {
        return bodyJSON
      }
    } else {
      warn(copyName + 'must be given.')
      return null
    }
  },

  /**
   * This function sets content manually and returns JSON.
   * @name     EmailSender.setContentManual
   * @memberOf EmailSender
   * @param    {JSON} emailContent
   * @returns  {JSON} bodyJSON
   */
  setContentManual: function (emailContent) {
    info('Setting email content..')
    var contentJSON = { html: '', plain: '' }
    if (emailContent) {
      if (emailContent.html || emailContent.html !== '') {
        contentJSON.html = emailContent.html
      } else {
        info("emailContent's html is not found.")
      }
      if (emailContent.plain || emailContent.plain !== '') {
        contentJSON.plain = emailContent.plain
      } else {
        info("emailContent's plain text is not found.")
      }
    } else {
      warn('Email content is not given.')
      return null
    }
    return contentJSON
  },

  /**
   * This function checks email addresses and returns the destination array.
   * @name     EmailSender.setDestination
   * @memberOf EmailSender
   * @param    {String} toEmail
   * @returns  {array} destination
   */
  setDestination: function (toEmail) {
    info('Setting Recieving Address to : ' + toEmail)
    var destination = []
    if (typeof toEmail === 'string') {
      toEmail = [toEmail]
      for (var i = 0; i < toEmail.length; i++) {
        if (EmailSender.isEmailValid(toEmail[i])) {
          destination.push(toEmail[i])
        }
      }
      return destination
    } else {
      warn('Wrong type of email address is given.')
      return null
    }
  },

  /**
   * This function checkes the source address and return the address string.
   * @name     EmailSender.setSource
   * @memberOf EmailSender
   * @param    {String} fromEmail
   * @returns  {String} source
   */
  setSource: function (fromEmail) {
    var source
    info('Setting Sending Address to : ' + fromEmail)
    if (typeof fromEmail === 'string') {
      if (EmailSender.isEmailValid(fromEmail)) {
        source = fromEmail
      } else {
        source = EmailSender.DEFAULT_FROM
      }
      return source
    } else {
      warn('Wrong type of email address is given.')
      return null
    }
  },

  /**
   * This function configures complicated email structures that uses email copy list at once.
   * This is used in utility.sendEmail().
   * @name     EmailSender.build
   * @memberOf EmailSender
   * @param    {JSON} emailInfo
   * @returns  {JSON} emailJSON
   */
  build: function (emailInfo) {
    info('Configuring email..')
    var emailContent, emailSubject, emailDestination, emailSource

    if (emailInfo.customValues.url === 'https://localhost') {
      emailInfo.customValues.asset_url = 'https://cadet.auvenir.com'
    } else {
      emailInfo.customValues.asset_url = emailInfo.customValues.url
    }

    emailContent = EmailSender.setTemplate(emailInfo.status)
    emailContent.html.htmlBody = EmailSender.applyCustomValue(EmailSender.setContent(emailInfo.status).html, emailInfo.customValues)
    emailContent.plain = EmailSender.applyCustomValue(EmailSender.setContent(emailInfo.status).plain, emailInfo.customValues)
    emailSubject = EmailSender.applyCustomValue(EmailSender.setSubject(emailInfo.status), emailInfo.customValues)
    emailDestination = EmailSender.setDestination(emailInfo.toEmail)
    emailSource = EmailSender.setSource(emailInfo.fromEmail)

    var emailJSON = {
      source: emailSource,
      destination: emailDestination,
      subject: emailSubject,
      content: { html: emailContent.html.htmlBody, plain: emailContent.plain }
    }
    return emailJSON
  },

  /**
   * This function configures complicated email structures that doesn't use pre-made template at once.
   * This is used in utility.sendEmail().
   * @name     EmailSender.buildManual
   * @memberOf EmailSender
   * @param    {JSON} emailInfo
   * @returns  {JSON} emailJSON
   */
  buildManual: function (emailInfo) {
    info('Configuring custom email..')
    var emailContent, emailSubject, emailDestination, emailSource

    emailContent = EmailSender.setTemplate()
    emailContent.html.htmlBody = EmailSender.setContentManual(emailInfo.content).html
    emailContent.plain = EmailSender.setContentManual(emailInfo.content).plain
    emailSubject = EmailSender.setSubjectManual(emailInfo.subject)
    emailDestination = EmailSender.setDestination(emailInfo.toEmail)
    emailSource = EmailSender.setSource(emailInfo.fromEmail)

    var emailJSON = {
      source: emailSource,
      destination: emailDestination,
      subject: emailSubject,
      content: { html: emailContent.html.htmlHeader + emailContent.html.htmlBody + emailContent.html.htmlFooter, plain: emailContent.plain }
    }
    return emailJSON
  },

  /**
   * This function sends email via nodemailer.
   * This is used in utility.sendEmail().
   * @name     EmailSender.sendEmail_mailer
   * @memberOf EmailSender
   * @param    {JSON} emailJSON
   * @returns  {callback} callback with code and message
   */
  sendEmail_mailer: function (emailJSON, callback) {
    var SERVICE = this.SERVICE
    var AUTH_USER = this.AUTH_USER
    var AUTH_PASS = this.AUTH_PASS
    var FROM = this.DEFAULT_FROM
    info('Sending Email via NodeMailer..')
    info(EmailSender.DEFAULT_FROM)
    var transporter = nodemailer.createTransport(
      {
        service: SERVICE,
        auth: {
          user: AUTH_USER,
          pass: AUTH_PASS
        }
      },
      {
        from: FROM
      })
    // var transporter = nodemailer.createTransport('smtps://no-reply%40auvenir.com:BSLabs123!@smtp.gmail.com');
    transporter.sendMail(
      {
        to: emailJSON.destination,
        subject: emailJSON.subject,
        text: emailJSON.content.plain,
        html: emailJSON.content.html
      }, function (err) {
      if (err) {
        error('Error on sending local email.', {err})
        callback({ code: 202, msg: 'There is error sending local email.' })
      } else {
        info('Successful on sending Email')
        callback(null, { code: 0, msg: 'Email Sent!' })
      }
    })
  },

  /**
   * This function sends email via Amazon service.
   * This is used in utility.sendEmail().
   * @name     EmailSender.sendEmail_AWS
   * @memberOf EmailSender
   * @param    {JSON} emailJSON
   * @returns  {callback} callback with code and message
   */
  sendEmail_AWS: function (emailJSON, callback) {
    var params = {
      Destination: { BccAddresses: [], CcAddresses: [], ToAddresses: emailJSON.destination },
      Message: {
        Body: {
          Html: { Data: emailJSON.content.html, Charset: 'UTF-8' },
          Text: { Data: emailJSON.content.plain, Charset: 'UTF-8' }
        },
        Subject: { Data: emailJSON.subject, Charset: 'UTF-8' }
      },
      Source: emailJSON.source,
      ReplyToAddresses: [emailJSON.source]
    }
    ses.sendEmail(params, function (err, data) {
      if (err) {
        error('Error on sending Email.', {err})
        callback({ code: 202, msg: 'There was error sending email.' })
      } else {
        info('Successful on sending Email')
        callback(null, { code: 0, msg: 'Email Sent!' })
      }
    })
  }
}

module.exports = EmailSender
