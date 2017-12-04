var express = require('express');
var path = require('path');
var appConfig = require('./config');
var app = express();
let morgan = require('morgan');

app.use(express.static(path.join(__dirname, 'public')));

let port = appConfig.server.port;
if (appConfig.env !== 'test')
    app.use(morgan('combined'));
else
    port = appConfig.server_test.port;

app.use('/', require('./router'));

app.set('port', port)

let listener = app.listen(port, () => {
    console.log('Server running on localhost:' + listener.address().port);
});

module.exports = app;// for testing

