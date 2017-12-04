var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mydatabase = require('../connection');

var imgSchema = new Schema({
    url: String,
    crowd: Number,
    community: Number,
    youth: Number,
    child: Number,
    recreation: Number,
    audiance: Number,
    tourism: Number,
    publicEvent: Number,
    festival: Number,
    fun: Number,
    city: Number,
    blockParty: Number,
    Fete: Number,
    leisure: Number,
    class: Number,
    created_at: Date
});

var Img = mydatabase.model('Img', imgSchema);
module.exports = Img;