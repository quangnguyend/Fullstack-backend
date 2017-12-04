var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var multer = require('multer');
var Img = require('../controllers').uploadController;

router.use(bodyParser.json());

var storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, './public/images') },
    filename: function (req, file, cb) { cb(null, file.originalname) }
});

// Create the multer instance here
var upload = multer({ storage: storage });


router.post('/img', upload.single('imgFile'), Img.upload_img)

module.exports = router;