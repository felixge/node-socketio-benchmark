var io           = require('socket.io-client');
var EventEmitter = require('events').EventEmitter;
var util         = require('util');

module.exports = WebSocket;
util.inherits(WebSocket, EventEmitter);

function WebSocket() {
  EventEmitter.call(this);

  this.connection = null;
  this.port       = null;
  this.host       = null;
  this.transport  = 'websocket';
}

WebSocket.create = function(host, port) {
  var instance = new this();
  instance.port = port;
  instance.host = host;

  return instance;
}

WebSocket.prototype.connect = function() {
  var self = this;

  this.connection = io.connect(
    'http://' + this.host + ':' + this.port,
    {'force new connection': true}
  );

  this.connection.on('connection', function() {
    self.emit('connection');
  });

  this.connection.on('error', function(error) {
    self.emit('error', error);
  });

  this.connection.on('chat.msg', function(message) {
    self.emit('message', message);
  });
}

WebSocket.prototype.send = function(message) {
  this.connection.emit('chat.send', message);
}

WebSocket.prototype.disconnect = function() {
  this.connection.disconnect();
}
