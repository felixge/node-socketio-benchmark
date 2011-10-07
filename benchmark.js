var options = require('commander');
var transports = {
  'xhr-polling': require('./transport/xhr_polling'),
};
options
  .option('-p, --port [port]', 'The port to connect to [3030]', 3030)
  .option('-h, --host [host]', 'The host to connect to [localhost]', 'localhost')
  .option('-c, --clients [clients]', 'The number of total clients', 10)
  .option('-m, --messages [messages]', 'The number of messages to send per sec [0.1]', 0.1)
  .option('-i, --interval [interval]', 'The interval in seconds to accumlate stats [10]', 10)
  .option('-t, --transport [transport]', 'The transport type to use by the client [xhr-polling,websocket]', 'xhr-polling')
  .option('-%, --percentile [percentile]', 'The percentile to calculate latency for [95]', 95)
  .parse(process.argv);

function Benchmark() {
  this.clients = [];
  this.maxClients = null;
  this.interval = null;
  this.transport = null;
  this.connectedCounter = 0;
  this.percentile = null;
  this.responseTimes = [];
}

Benchmark.create = function(options) {
  var instance = new Benchmark();
  instance.maxClients = options.clients;
  instance.host = options.host;
  instance.port = options.port;
  instance.interval = options.interval;
  instance.transport = options.transport;
  instance.percentile = options.percentile;
  return instance;
};

Benchmark.prototype.start = function() {
  for (var i = 0; i < this.maxClients; i++) {
    this.connectClient();
  }
};

Benchmark.prototype.connectClient = function() {
  var client = transports[this.transport].create(this.port, this.host);
  client.connect();
  client
    .on('connect', this.handleConnect.bind(this, client))
    .on('message', this.handleMessage.bind(this, client))
    .on('error', this.handleError.bind(this, client));
  this.clients.push(client);
};

Benchmark.prototype.handleMessage = function(client, message) {
  var time = message.args[0].time;
  var latency = Date.now() - time;
  this.responseTimes.push(latency);

  if (this.responseTimes.length === this.clients.length) {
    this.analyze();
    this.responseTimes = [];
  }
};

Benchmark.prototype.analyze = function() {
  this.responseTimes.sort(function(a, b) {
    if (a === b) return 0;
    return (a < b)
      ? -1
      : 1;
  });

  var index = Math.ceil(this.responseTimes.length * this.percentile / 100);
  var responseTime = this.responseTimes[index];

  console.error(
    '%s percentile response time for %d clients: %d',
    this.percentile,
    this.clients.length,
    responseTime
  );
};

Benchmark.prototype.handleConnect = function(client, message) {
  this.connectedCounter++;
};

Benchmark.prototype.handleError = function(client, error) {
  var index = this.clients.indexOf(client);
  console.error('Error from client %d: %s', index, error);
};

var benchmark = Benchmark.create(options);
benchmark.start();
