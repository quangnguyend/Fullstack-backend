/* eslint no-console: 0 */

var convict = require('convict')
var schema = require('./schema')
var request = require('request')
var fs = require('fs')

try {
  // Set the schema for environment variables
  var config = convict(schema)
  // Load the proper config based on the NODE_ENV environment variables
  var env = config.get('env')
  console.log(`Setting up ${env} environment variables...`)
  if (fs.existsSync(`${__dirname}/../override-env.json`)) {
    console.log('Overriding environment variables...')
    config.loadFile(`${__dirname}/../override-env.json`)
  } else {
    config.loadFile(`${__dirname}/local.json`)
    if (env !== 'local') {
      var error = `override-env.json does not exist.`
    }
  }
  // Perform validation
  config.validate({ strict: true })
  console.log(`Environment variables successfully set to ${env}`)
  // Modify config
  var appConfig = config.getProperties()
  // MongoDB Setup
  var mongo = appConfig.mongo
  var dbs = appConfig.mongo.dbs
  var auth = (mongo.username && mongo.password) ? `${mongo.username}:${mongo.password}@` : ''
  var mongo1 = `${mongo.host_one}:${mongo.port_one}`
  appConfig.mongo.URI = {}
  // Set MongoDB URI
  if (mongo.useReplica) {
    // Add the replica set if defined
    var mongo2 = mongo.host_two ? `,${mongo.host_two}:${mongo.port_two}` : ''
    var mongo3 = mongo.host_three ? `,${mongo.host_three}:${mongo.port_three}` : ''
    for (let i = 0; i < dbs.length; i++) {
      appConfig.mongo.URI[dbs[i]] = `mongodb://${auth}${mongo1}${mongo2}${mongo3}/${dbs[i]}?authSource=admin`
    }
    delete appConfig.mongo.options.server
  } else {
    for (let i = 0; i < dbs.length; i++) {
      appConfig.mongo.URI[dbs[i]] = `mongodb://${auth}${mongo1}/${dbs[i]}?authSource=admin`
    }
    delete appConfig.mongo.options.replset
  }

  // New Relic Setup
  appConfig.integrations.newrelic.app_name = `${appConfig.integrations.newrelic.app_name} - ${env.toUpperCase()}`
  // Throw error if it exists
  if (error) {
    throw new Error(error)
  }
} catch (err) {
  console.log('Environment variables did not pass validation', err)
  if (env !== 'local') {
    // Post Notification to Slack
    var options = {
      text: `WARNING!!! Missing environment variable in the ${env} environment! ${err}`,
      channel: 'dev-circle'
    }
    request.post(appConfig.integrations.slack.URL, { body: JSON.stringify(options) }, function (err, res, body) {
      if (err) {
        console.log('Failed to notify Slack of configuration error')
      } else {
        if (body === 'ok') {
          console.log('Successfully notified slack of environment variable issue')
        } else {
          console.log('Failed to notify Slack of configuration error')
        }
      }
    })
  }
}

module.exports = appConfig
