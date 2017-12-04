var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mydatabase = require('../connection');

var userSchema = new Schema({
  name: { type: String, default: '' },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  admin: Boolean,
  address: { type: String, default: '' },
  email: { type: String, default: '' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: null }
}, { versionKey: false });

var User = mydatabase.model('User', userSchema);
module.exports = User;