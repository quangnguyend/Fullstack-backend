let uploadController = require('./uploadImg');
let userController = require('./user');
let loginController = require('./login');
let Controllers = {
  userController: userController,
  uploadController: uploadController,
  loginController: loginController
}
module.exports = Controllers;