
/***
 * INSPECTOR
 *
 * Responsible for launching the data gathering from 3rd party APIs that will scrape the internet based
 * solely on an email address.  This data is then returned in a mapped JSON object.  If requested we can
 * also returned the data as a raw JSON object where the individual service data is included.
 *
 * Currently only supporting Clearbit
 *
 ***/
var initLogger = require('../logger/logger').init
const {info, warn, error} = initLogger(__filename)

var Inspector = function () {
  var appConfig = require('../../config')
  var Clearbit = require('clearbit')(appConfig.integrations.clearbit.id)
  var Code = require('../../plugins/utilities/code')

  var EMAIL_REGEX = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i
  var currentEmail = null

  var rawData = {
    clearbit: null
  }

  var mappedData = {}
  var uniqueData = {}

  var services = ['clearbit']

  /**
   * Checks the validity of the parameters before triggering the data gathering
   * for the individual services.
   */
  this.retrieveData = function (email, callback) {
    if (typeof callback !== 'function') {
      callback({code: Code.ERROR_INSPECTOR, msg: 'Invalid callback function'})
      return
    }

    if (!EMAIL_REGEX.test(email)) {
      callback({code: Code.ERROR_INSPECTOR, msg: 'Invalid email address'})
      return
    }

    resetData()
    currentEmail = email

    runService(services, 0, callback)
  }

  /**
   * Returns a copy of the latest raw data retrieved from the services.
   */
  this.getRawData = function () {
    return rawData
  }

  /**
   * Responsible for resetting all the fields for another iteration of data retrieval.
   */
  var resetData = function () {
    currentEmail = null
    rawData = {
      clearbit: null
    }
    mappedData = {}
  }

  /**
   * Execute the services given a specific executiob order.
   */
  function runService (services, pos, callback) {
    switch (services[pos]) {
      case 'clearbit':
        retrieveClearbitData(services, pos, callback)
        break
      default:
        warn('Unsupported service: ' + services[pos])
        nextService(services, pos, callback)
    }
  }

  /**
   * Checks to see if there is another service that needs to be executed before triggering
   * the callback to the user.
   */
  function nextService (services, pos, callback) {
    pos++
    if (pos < services.length) {
      runService(services, pos, callback)
    } else {
      processMappedData()
      callback(null, uniqueData)
    }
  }

  /**
   * Retrieves person and company information from clearbit, returns it and
   * calls the callback function.
   */
  function retrieveClearbitData (services, pos, callback) {
    info('Inspector: Checking Clearbit ...')

    Clearbit.Enrichment
      .find({email: currentEmail, stream: true})
      .then(function (response) {
        rawData.clearbit = response

        mapClearbitData(response)
        nextService(services, pos, callback)
      })
      .catch(Clearbit.Person.NotFoundError, function (err) {
        error('Inspector: person not found error', {err})
        nextService(services, pos, callback)
      })
      .catch(function (err) {
        error('Inspector: general error', {err})
        nextService(services, pos, callback)
      })
  }

  /**
   * Adds the clearbit data to the appropriate parts of the intelligence gathered.
   * Currently only supports integration for SOME of the clearbit data.
   */
  function mapClearbitData (data) {
    info('Inspector: Mapping Clearbit data ...')
    var person = data.person
    var company = data.company

    if (person !== null) {
      if (mappedData.person === undefined) {
        mappedData.person = {}
        mappedData.person.name = []
        mappedData.person.email = []
        mappedData.person.gender = []
        mappedData.person.company = []
        mappedData.person.jobTitle = []
        mappedData.person.website = []
        mappedData.person.domain = []
        mappedData.person.avatar = []
      }

      var name = { first: person.name.givenName, last: person.name.familyName }
      pushUnique(mappedData.person.name, name)

      pushUnique(mappedData.person.email, person.email)
      pushUnique(mappedData.person.gender, person.gender)
      pushUnique(mappedData.person.company, person.github.company)
      pushUnique(mappedData.person.jobTitle, person.employment.title)
      pushUnique(mappedData.person.website, person.site)
      pushUnique(mappedData.person.website, person.twitter.site)
      pushUnique(mappedData.person.website, person.angellist.site)

      pushUnique(mappedData.person.domain, person.employment.domain)

      pushUnique(mappedData.person.avatar, person.avatar)
      pushUnique(mappedData.person.avatar, person.github.avatar)
      pushUnique(mappedData.person.avatar, person.twitter.avatar)
      pushUnique(mappedData.person.avatar, person.angellist.avatar)
      pushUnique(mappedData.person.avatar, person.aboutme.avatar)
    }

    if (company) {
      if (!mappedData.company) {
        mappedData.company = {}
        mappedData.company.name = []
        mappedData.company.phone = []
        mappedData.company.url = []
        mappedData.company.logo = []
        mappedData.company.address = []
      }

      pushUnique(mappedData.company.name, company.name)
      pushUnique(mappedData.company.phone, company.phone)
      pushUnique(mappedData.company.url, company.url)
      pushUnique(mappedData.company.logo, company.logo)

      var address = {
        streetNumber: company.geo.streetNumber,
        streetName: company.geo.streetName,
        unit: company.geo.subPremise,
        city: company.geo.city,
        country: company.geo.country,
        state: company.geo.state,
        postalCode: company.geo.postalCode
      }

      pushUnique(mappedData.company.address, address)
    }
  }

  function processMappedData () {
    var p = mappedData.person
    if (p !== null && p !== undefined) {
      uniqueData.person = {}
      var pKeys = Object.keys(p)
      for (var i = 0; i < pKeys.length; i++) {
        var field = p[pKeys[i]]
        var winner = null

        if (field.length > 0) {
          winner = field[0]
        }
        for (var j = 0; j < field.length; j++) {
          if (field[j].count > winner.count) {
            winner = field[j]
          }
        }
        uniqueData.person[pKeys[i]] = (winner !== null) ? winner.name : null
      }
    }

    var c = mappedData.company
    if (c) {
      uniqueData.company = {}
      var cKeys = Object.keys(c)
      for (i = 0; i < cKeys.length; i++) {
        field = c[cKeys[i]]
        winner = null

        if (field.length > 0) {
          winner = field[0]
        }
        for (j = 0; j < field.length; j++) {
          if (field[j].count > winner.count) {
            winner = field[j]
          }
        }
        uniqueData.company[cKeys[i]] = (winner) ? winner.name : null
      }
    }
  }

  /**
   * Work around function instead of Array.prototype.pushUnique() because PDF2JSON module doesn't play well
   * when the Array.prototype object has additional function called pushUnique.
   */
  var pushUnique = function (arr, str) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].name === str) {
        arr[i].count++
        return
      }
    }
    if (str !== null) {
      arr.push({ name: str, count: 1 })
    }
    return
  }
}

module.exports = Inspector
