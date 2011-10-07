var io           = require('socket.io-client');
var EventEmitter = require('events').EventEmitter;
var util         = require('util');

module.exports = XhrPolling;
util.inherits(XhrPolling, EventEmitter);

function XhrPolling() {
  EventEmitter.call(this);

  this.connection = null;
  this.port       = null;
  this.host       = null;
}

XhrPolling.create = function(port, host) {
  var instance = new this();
  instance.port = port;
  instance.host = host;

  return instance;
}

XhrPolling.prototype.connect = function() {
  var self = this;

  io.transports = ['xhr-polling'];
  this.connection = io.connect(
    'http://' + this.host + ':' + this.port,
    {'force new connection': true}
  );


  this.connection
    .on('connection', function() { self.emit('connection'); })
    .on('chat.msg', function(msg) { self.emit('message', {args: [msg]}); })
    .on('error', this.handleError.bind(this));

  this.connection.socket.on('error', this.handleError.bind(this));
}

XhrPolling.prototype.handleError = function(error) {
  var err = typeof error === 'string' ? new Error(error) : error;
  this.emit('error', err);
}

XhrPolling.prototype.send = function(message) {
  this.connection.emit('chat.send', message);
}

XhrPolling.prototype.disconnect = function() {
  this.connection.disconnect();
}
