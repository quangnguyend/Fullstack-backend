var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var secret = require('../config').security.session_secret;
router.use(bodyParser.json());


router.use((req, res, next) => {
  let token = req.headers['x-access-token'] || req.headers['api_key'];
  if (token) {
    jwt.verify(token, secret, (err, decoded) => {
      if (err)
        return res.json({ success: false, message: 'Failed to authenticate token.' })
      else {
        req.decoded = decoded;
        next();
      }
    })
  } else {
    return res.status(403).send({
      success: false,
      message: 'No token provided.'
    })
  }
})

module.exports = router;