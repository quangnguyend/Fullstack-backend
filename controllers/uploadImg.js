
var Img = require('../models').database_mongod.img;
var ObjectId = require('mongoose').Types.ObjectId;

exports.upload_img = (req, res) => {
  let fileName = req.file.originalname;
  let imgUri = './../public/images/' + fileName;
  res.send('Upload success');
}