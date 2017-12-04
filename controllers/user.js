var User = require('../models').database_mongod.user;
var ObjectId = require('mongoose').Types.ObjectId;
/**
 * @swagger
 * resourcePath: /users
 * description: All about API
 */

/**
* @swagger
* models:
*   User:
*     id: User
*     properties:
*       name:
*         type: String
*       username:
*         type: String    
*       password:
*         type: String 
*       admin:
*         type: Boolean 
*       address:
*         type: String 
*       email:
*         type: String 
*/

/**
 * @swagger
 * path: /users/getAll
 * operations:
 *   -  httpMethod: GET
 *      summary: get all users
 *      notes: Returns a user based on username
 *      responseClass: User
 *      nickname: getAll
 *      type: Order
 *      consumes: 
 *        - text/html
 *      
 */
exports.user_list = (req, res) => {
  User.find({}, (err, users) => {
    if (err) return res.status(400) && res.json(err);
    res.json(users)
  })
}
/**
 * @swagger
 * path: /users/findById/{id}
 * operations:
 *   -  httpMethod: GET
 *      summary: get user by id
 *      notes: Returns a user
 *      responseClass: User
 *      nickname: getUserById
 *      type: Order
 *      consumes: 
 *        - text/html
 *      parameters: 
 *        - name: id
 *          description: user id
 *          paramType: path
 *          required: true
 *          dataType: order
 *        
 *      
 */
exports.user_find = (req, res) => {
  let id = req.params.id
  User.findById(id, (err, users) => {
    if (err) return res.status(400) && res.json(err);
    res.json(users)
  })
}

/**
* @swagger
* path: /users/addUser
* operations:
*   -  httpMethod: POST
*      summary: add users
*      notes: Returns a user based on username
*      responseClass: User
*      nickname: addUser
*      consumes: 
*        - text/html
*      parameters:
*        - name: body
*          description: object User
*          paramType: body
*          required: true
*          dataType: order
*/
exports.user_create = (req, res) => {
  let newUser = new User({
    name: req.body.name,
    username: req.body.username,
    password: req.body.password,
    admin: req.body.admin,
    created_at: new Date()
  });
  newUser.save(err => {
    if (err) {
      return res.status(400) && res.json(err);
    }
    res.status(200).send('User created!')
  })
}

exports.user_update = (req, res) => {
  let id = req.params.id;
  let updateUser = {
    name: req.body.name,
    username: req.body.username,
    passwork: req.body.passwork,
    admin: req.body.admin,
    updated_at: new Date()
  };
  User.findByIdAndUpdate(id, updateUser, (err, user) => {
    if (err) return res.status(400) && res.json(err);
    res.status(200).send('User updated');
  })
}
/**
 * @swagger
 * path: /users/removeUser/{id}
 * operations:
 *   -  httpMethod: DELETE
 *      summary: remove users
 *      notes: Returns a user based on username
 *      nickname: removeUser
 *      type: void
 *      consumes: 
 *        - text/html
 *      parameters:
 *        - name: id
 *          description: ID of the user that needs to be deleted
 *          paramType: path
 *          required: true
 *          dataType: string
 */
exports.user_delete = (req, res) => {
  let id = req.params.id;
  User.findOneAndRemove({ _id: ObjectId(id) }, err => {
    if (err) return res.status(400) && res.json(err);
    res.status(200).send('User deleted');
  })
}