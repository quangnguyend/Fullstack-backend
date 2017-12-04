let img = require('./img');
let user = require('./user');
let connection = require('./connection');

let myDb = {
    connection: connection,
    img: img,
    user: user
}

module.exports = myDb;
