var express = require('express');
var router = express.Router();
var swagger = require('../swagger');

let users = require('./user');
let upload = require('./uploadImg');
let login = require('./login');

router.use('/users', users)
router.use('/upload', upload)
router.use('/login', login)

//init Swagger
router.use(swagger.init(router, {
    apiVersion: '1.0',
    swaggerVersion: '1.0',
    basePath: 'http://localhost:5000',
    swaggerURL: '/swagger',
    swaggerJSON: '/api',
    swaggerUI: 'public/swagger/',
    apis: [
        'controllers/user.js',
        'controllers/login.js'
    ]
}))

module.exports = router;