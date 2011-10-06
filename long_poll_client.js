var options = require('commander');
var http = require('http');
var querystring = require('querystring');
var clients = [];
var EventEmitter = require('events').EventEmitter;
var util = require('util');

options
  .option('-p, --port [port]', 'The port to connect to [3030]', 3030)
  .option('-h, --host [host]', 'The host to connect to [localhost]', 'localhost')
  .option('-c, --clients [clients]', 'The number of total clients', 10)
  .option('-m, --messages [messages]', 'The number of messages to send per sec [0.1]', 0.1)
  .option('-i, --interval [interval]', 'The interval in seconds to accumlate stats', 10)
  .parse(process.argv);

util.inherits(LongPollingClient, EventEmitter);
function LongPollingClient() {
  EventEmitter.call(this);

  this.port = null;
  this.host = null;
  this.connecting = false;
  this.connected = false;
  this.sessionId = null;
  this.transport = 'xhr-polling';

  this._request = null;
}

LongPollingClient.create = function(port, host) {
  var instance = new this();
  instance.port = port;
  instance.host = host;
  return instance;
};

LongPollingClient.prototype.connect = function() {
  this.connecting = true;
  this.handshake();
};

LongPollingClient.prototype.handshake = function() {
  var self = this;
  this.request(function(err, response) {
    if (err) throw err;

    self.sessionId = response[0];
    self.poll();
  });
};

LongPollingClient.prototype.poll = function() {
  var self = this;
  this.request(function(err, response) {
    if (err) throw err;

    if (response[0] === '7') {
      throw new Error('Error: ' + JSON.stringify(response));
    }

    // Connected
    if (response[0] === '1') {
      self.connected = true;
      self.connecting = false;
      self.emit('connect');
      self.poll();
      return;
    }

    // Event
    if (response[0] === '5') {
      var message = JSON.parse(response[3]);
      self.emit('message', message);
      self.poll();
      return;
    }

    throw new Error('Not implemented: ' + JSON.stringify(response));
  });
};

LongPollingClient.prototype.request = function(endpoint, cb) {
  if (typeof endpoint === 'function') {
    cb = endpoint;
    endpoint = '';
  }

  if (endpoint) endpoint = '/' + endpoint;

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

  this._request = http.get(options, this.handleResponse.bind(this, cb));
};

LongPollingClient.prototype.handleResponse = function(cb, res) {
  var data = '';
  res.setEncoding('utf8');
  res
    .on('data', function(chunk) {
      data += chunk;
    })
    .on('end', function() {
      var message = [];

      for (var i = 0; i < 3; i++) {
        var end = data.indexOf(':');
        message[i] = data.substr(0, end);
        data = data.substr(end + 1);
      }

      message[3] = data;

      cb(null, message);
    });
};

function Benchmark() {
  this.clients = [];
  this.maxClients = null;
  this.interval = null;
  this.connectedCounter = 0;
  this.messageCounter = 0;
}

Benchmark.create = function(options) {
  var instance = new Benchmark();
  instance.maxClients = options.clients;
  instance.host = options.host;
  instance.port = options.port;
  instance.interval = options.interval;
  return instance;
};

Benchmark.prototype.start = function() {
  for (var i = 0; i < this.maxClients; i++) {
    this.connectClient();
  }

  setInterval(this.printStats.bind(this), this.interval * 1000);
};

Benchmark.prototype.printStats = function() {
  console.error(
    'Received %d messages / sec (%d clients)',
    this.messageCounter / this.interval / this.clients.length,
    this.connectedCounter
  );
  this.messageCounter = 0;
};

Benchmark.prototype.connectClient = function() {
  var client = LongPollingClient.create(this.port, this.host);
  client.connect();
  client
    .on('connect', this.handleConnect.bind(this, client))
    .on('message', this.handleMessage.bind(this, client));
  this.clients.push(client);
};

Benchmark.prototype.handleMessage = function(client, message) {
  this.messageCounter++;
};

Benchmark.prototype.handleConnect = function(client, message) {
  this.connectedCounter++;
};

var benchmark = Benchmark.create(options);
benchmark.start();
