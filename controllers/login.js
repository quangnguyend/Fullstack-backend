var jwt = require('jsonwebtoken');
var secret = require('../config').security.session_secret;
var User = require('../models').database_mongod.user;
var ObjectId = require('mongoose').Types.ObjectId;
/**
 * @swagger
 * resourcePath: /login
 * descirption: anthenticate
 */

/**
 * @swagger
 * models:
 *    User:
 *      properties:
 *        username: 
 *          type: String
 *        password:
 *          type: String
 */

/**
 * @swagger
 * path: /login
 * operations:
 *    -   httpMethod: POST
 *        summary: anthenticate
 *        node: return token
 *        nickname: anthToken
 *        responseClass : User
 *        consumes:
 *          - text/html
 *        parameters:
 *          - name: body
 *            descirption: token
 *            paramType: body
 *            required: true
 *            dataType: order
 */
exports.login = (req, res) => {
  let userLogin = req.body;
  if (!userLogin.username || !userLogin.password) return res.status(400) && res.json({ message: 'Please enter your login information!' })
  User.find({ username: userLogin.username }, (err, user) => {
    if (err) return res.status(400) && res.json(err)
    if (user.length > 0) {
      if (user[0].password != userLogin.password) return res.status(400) && res.json({ message: 'Password is incorrect!' })
      let token = jwt.sign(userLogin, secret, {
        expiresIn: '1h'
      });
      res.json({
        success: true,
        message: 'Enjoy your token!',
        token: token
      })
    } else return res.status(400) && res.json({ message: 'Username is not exist!' })
  })
}
