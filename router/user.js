var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
let auth = require('../auth')

router.use(bodyParser.json());
router.use(auth);

var User = require('../controllers').userController;

router.get('/getAll', User.user_list)

router.get('/findById/:id', User.user_find)

router.post('/addUser', User.user_create)

router.delete('/removeUser/:id', User.user_delete)

router.put('/updateUser/:id', User.user_update)

module.exports = router;