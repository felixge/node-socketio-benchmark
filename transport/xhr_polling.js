var util       = require('util');
var WebSocket  = require('./websocket');
module.exports = XhrPolling;

util.inherits(XhrPolling, WebSocket);

function XhrPolling() {
  WebSocket.call(this);
  this.transport = 'xhr-polling';
}

XhrPolling.create = WebSocket.create;
