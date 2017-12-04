const appConfig = require('../../config')
const _ = require('lodash')
const tracer = require('tracer')

const logger = tracer[appConfig.env === 'local' ? 'colorConsole' : 'console']({
  stackIndex: 2,
  format: '{{timestamp}} --- {{title}} --- line_{{line}}_at_{{message}}'
})

const httpLogger = tracer[appConfig.env === 'local' ? 'colorConsole' : 'console']({
  stackIndex: 3,
  format: '{{timestamp}} --- {{title}} --- {{message}}'
})

const reqSerializer = (req) => {
  const basic = {
    method: req.method,
    url: req.url
  }

  if (req.user) {
    basic.userEmail = req.user.email
  }

  if (appConfig.env === 'local') {
    return basic
  }
  basic.headers = req.headers
  basic.remoteAddress = req.connection.remoteAddress
  basic.remotePort = req.connection.remotePort
  return basic
}

const resSerializer = (res) => {
  const basic = {
    statusCode: res.statusCode
  }
  if (appConfig.env === 'local') {
    return basic
  }
  basic.header = res._header
  return basic
}

const init = (fileName, log = logger) => {
  const logArguments = (logger, argumentA, argumentB) => {
    if (_.isString(argumentA)) {
      if (_.isObject(argumentB)) {
        logger(`${fileName} --- ${argumentA}`, argumentB)
      } else {
        logger(`${fileName} --- ${argumentA}`)
      }
    } else if (_.isObject(argumentA)) {
      logger(`${fileName} --- `, argumentA)
    }
  }

  const info = (argumentA, argumentB) => {
    if (!appConfig.debug.log) {
      return
    }
    logArguments(log.info, argumentA, argumentB)
  }

  const warn = (argumentA, argumentB) => {
    if (!appConfig.debug.warn) {
      return
    }
    logArguments(log.warn, argumentA, argumentB)
  }

  const error = (argumentA, argumentB) => {
    if (!appConfig.debug.error) {
      return
    }
    logArguments(log.error, argumentA, argumentB)
  }
  return { info, warn, error }
}

function onResFinished (err) {
  this.removeListener('finish', onResFinished)
  this.removeListener('error', onResFinished)

  const responseTime = Date.now() - this.startTime

  if (err) {
    httpLogger.error('http request error\n', {
      req: reqSerializer(this.req),
      res: resSerializer(this),
      err: err,
      responseTime: responseTime
    })
    return
  }
  httpLogger.info('http request completed\n', {
    req: reqSerializer(this.req),
    res: resSerializer(this),
    responseTime: responseTime
  })
  return
}

function onReqAborted () {
  const res = this.res
  res.statusCode = 408
  onResFinished.call(res, new Error('Aborted'))
  return
}

const middleware = (req, res, next) => {
  const { info, warn, error } = init(req.user ? `http request in process ${req.user.email}` : 'http request in process', httpLogger)
  req.log = res.log = { info, warn, error }
  res.startTime = Date.now()
  req.res = res
  res.req = req

  res.on('finish', onResFinished)
  res.on('error', onResFinished)
  req.on('aborted', onReqAborted)

  if (next) {
    next()
  }
  return
}

module.exports = {
  init,
  middleware
}
