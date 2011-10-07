var http = require('http');
var querystring = require('querystring');
var clients = [];
var EventEmitter = require('events').EventEmitter;
var util = require('util');

module.exports = XhrPolling;
util.inherits(XhrPolling, EventEmitter);
function XhrPolling() {
  EventEmitter.call(this);

  this.port              = null;
  this.host              = null;
  this.connecting        = false;
  this.connected         = false;
  this.pollTimeout       = 20 * 1000;
  this.connectionTimeout = 3 * 1000;
  this.sessionId         = null;
  this.transport         = 'xhr-polling';

  this._request          = null;
  this._requestTimeout   = null;
}

XhrPolling.create = function(port, host) {
  var instance  = new this();
  instance.port = port;
  instance.host = host;
  return instance;
};

XhrPolling.prototype.connect = function() {
  this.connecting = true;
  this.handshake();
};

XhrPolling.prototype.disconnect = function() {
  try {
    this._request.destroy();
  } catch (err) {
    this.emit('error', err);
  }
};

XhrPolling.prototype.handshake = function() {
  var self = this;
  var timeout = setTimeout(function() {
    self.emit('error', new Error('Connection timeout'));
  }, this.connectionTimeout);

  this.request(function(err, response) {
    clearTimeout(timeout);
    if (err) return self.emit('error', err);

    self.connected = true;
    self.sessionId = response[0];
    self.poll();
  });
};

XhrPolling.prototype.poll = function() {
  var self = this;
  var timeout = setTimeout(function() {
    self.emit('error', new Error('Poll timeout'));
  }, this.pollTimeout);

  this.request(function(err, response) {
    clearTimeout(timeout);
    if (err) return self.emit('error', err);

    var type = response[0].replace(/\?[\d]+\?/, '');

    if (type === '7') {
      self.emit('error', new Error('Error: ' + JSON.stringify(response)));
    }

    // Connected
    if (type === '1') {
      self.connected  = true;
      self.connecting = false;
      self.emit('connect');
      self.poll();

      return;
    }

    // Event (wtf, why does the regex above not fix this?)
    if (/5$/.test(type)) {
      try{
        var message = JSON.parse(response[3]);
      } catch (err) {
        self.emit(new Error('Could not parse response: ' + JSON.stringify(response)));

        return;
      }

      self.emit('message', message);
      self.poll();
      return;
    }

    self.emit('error', new Error('Not implemented: ' + type + ': ' + JSON.stringify(response)));
  });
};

XhrPolling.prototype.request = function(endpoint, cb) {
  if (typeof endpoint === 'function') {
    cb = endpoint;
    endpoint = '';
  }

  var session = '';
  if (this.sessionId) {
    session = this.transport + '/' + this.sessionId;
  }

  var path = '/socket.io/1/' + session + endpoint;
  var options = {
    host: this.host,
    port: this.port,
    path: path,
  };

  var agent = http.getAgent(options.host, options.port)
  agent.maxSockets = 1000;

  this._request = http.get(options, this.handleResponse.bind(this, cb));

  var self = this;
  this._request.on('error', function(err) {
    self.emit('error', err);
  });
};

XhrPolling.prototype.handleResponse = function(cb, res) {
  var data = '';
  res.setEncoding('utf8');
  res
    .on('data', function(chunk) {
      data += chunk;
    })
    .on('end', function() {
      var message = [];

      for (var i = 0; i < 3; i++) {
        var end    = data.indexOf(':');
        message[i] = data.substr(0, end);
        data       = data.substr(end + 1);
      }

      message[3] = data;

      cb(null, message);
    });
};
