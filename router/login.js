var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');

router.use(bodyParser.json());

var login = require('../controllers').loginController;

router.post('/', login.login);

module.exports = router;