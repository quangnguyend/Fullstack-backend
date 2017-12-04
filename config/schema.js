// For more available type formats check out https://github.com/mozilla/node-convict#validation
module.exports = {
  env: {
    doc: 'The application environment.',
    format: ['prod', 'deloitte', 'staging', 'qa', 'dev', 'local'],
    default: 'local',
    env: 'NODE_ENV',
    arg: 'env'
  },
  server: {
    protocol: { default: 'https', format: String },
    domain: { default: null, format: String},
    port: { default: null, format: Number}
  },
  redis: {
    domain: { default: 'redis', format: String },
    port: { default: 6379, format: Number }
  },
  mongo: {
    username: { default: null, format: String},
    password: { default: null, format: String},
    host_one: { default: null, format: String},
    port_one: { default: null, format: String},
    host_two: { default: null, format: String},
    port_two: { default: null, format: String},
    host_three: { default: null, format: String},
    port_three: { default: null, format: String},
    dbs: { default: [ 'auvenir', 'gdrive' ], format: Array},
    path: { default: null, format: String},
    useReplica: { default: null, format: Boolean },
    options: {
      server: {
        ssl: { default: null, format: Boolean },
        sslValidate: { default: null, format: Boolean },
        socketOptions: {
          auto_reconnect: { default: null, format: Boolean },
          connectTimeoutMS: { default: null, format: Number }
        }
      },
      replset: {
        rs_name: { default: null, format: String },
        ssl: { default: null, format: Boolean },
        sslValidate: { default: null, format: Boolean },
        checkServerIdentity: { default: null, format: Boolean },
        socketOptions: {
          connectTimeoutMS: { default: null, format: Number },
          socketTimeoutMS: { default: null, format: Number }
        }
      }
    }
  },
  socket: {
    url: { default: null, format: String },
    port: { default: null, format: String },
    path: { default: null, format: String }
  },
  security: {
    ssl_certs: {
      rKey: { default: null, format: String },
      rCert: { default: null, format: String },
      rCA: { default: null, format: String },
      passphrase: { default: null, format: String }
    },
    session_secret: { default: null, format: String },
    crypto: {
      algorithm: { default: null, format: String },
      password: { default: null, format: String }
    },
    file_encryption: {
      secret: { default: null, format: String },
      algorithm: { default: null, format: String }
    }
  },
  file_scan: {
    scan_log: { default: null, format: Boolean },
    debug_mode: { default: null, format: Boolean },
    file_list: { default: null, format: Boolean },
    scan_recursively: { default: null, format: Boolean },
    clamscan: {
      active: {default: null, format: Boolean }
    },
    clamdscan: {
      active: { default: null, format: Boolean },
      multiscan: {default: null, format: Boolean }
    },
    preference: { default: null, format: String }
  },
  file_upload: {
    maxFieldSize: { default: null, format: Number },
    keepExtensions: {default: null, format: Boolean }
  },
  debug: {
    log: { default: null, format: Boolean },
    warn: { default: null, format: Boolean },
    time: { default: null, format: Boolean },
    error: {default: null, format: Boolean }
  },
  integrations: {
    newrelic: {
      app_name: { default: null, format: String },
      license_key: { default: null, format: String },
      logging: {
        level: { default: null, format: String }
      }
    },
    qa: {
      authID: { default: null, format: String },
      apiKey: { default: null, format: String }
    },
    aws: {
      accessKeyId: { default: null, format: String },
      secretAccessKey: { default: null, format: String },
      region: { default: null, format: String }
    },
    clearbit: {
      id: { default: null, format: String }
    },
    idq: {
      keys: {
        id: { default: null, format: String },
        secret: { default: null, format: String },
        callback: { default: null, format: String }
      },
      user: { default: null, format: String },
      pass: { default: null, format: String },
      regUrl: { default: null, format: String },
      logUrl: { default: null, format: String }
    },
    gdrive: {
      appID: { default: null, format: String },
      APIKey: { default: null, format: String },
      CLIENT_ID: { default: null, format: String },
      CLIENT_SECRET: { default: null, format: String },
      project_id: { default: null, format: String }
    },
    nodemailer: {
      service: { default: null, format: String },
      auth: {
        user: { default: null, format: String },
        pass: { default: null, format: String }
      },
      from: { default: null, format: String }
    },
    twilio: {
      account: { default: null, format: String },
      token: { default: null, format: String },
      number: { default: null, format: String }
    },
    slack: {
      APP_NAME: { default: null, format: String },
      URL: { default: null, format: String },
      channel: {
        GENERAL: { default: null, format: String },
        SIGNUP_USER: { default: null, format: String },
        SIGNUP_AUDITOR: { default: null, format: String }
      }
    },
    google_analytics: {
      id: { default: null, format: String }
    },
    hot_jar: {
      id: { default: null, format: String },
      hjsv: { default: null, format: String }
    },
    intercom: {
      id: { default: null, format: String }
    }
  }
}
