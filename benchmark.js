var options = require('commander');
var transports = {
  'xhr-polling': require('./transport/xhr_polling'),
  'websocket': require('./transport/websocket')
};
options
  .option('-p, --port [port]', 'The port to connect to [3030]', 3030)
  .option('-h, --host [host]', 'The host to connect to [localhost]', 'localhost')
  .option('-c, --clients [clients]', 'The number of total clients', 10)
  .option('-m, --messages [messages]', 'The number of messages to send per sec [0.1]', 0.1)
  .option('-i, --interval [interval]', 'The interval in seconds to accumlate stats [1]', 1)
  .option('-t, --transport [transport]', 'The transport type to use by the client [xhr-polling,websocket]', 'xhr-polling')
  .option('-%, --percentile [percentile]', 'The percentile to calculate latency for [95]', 95)
  .parse(process.argv);

function Benchmark() {
  this.clients = [];
  this.maxClients = null;
  this.interval = null;
  this.transport = null;
  this.percentile = null;
  this.messageTimeout = 2 * 1000;

  this.batches = {};
  this.responseTimes = {};
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
  var size = message.args[0].size;
  var batchId = message.args[0].batch;
  var latency = Date.now() - time;

  var batch = this.batches[batchId];
  if (!batch) {
    batch = this.batches[batchId] = {
      responseTimes: [],
      size: size,
    };

    batch.timeout = setTimeout(this.analyzeBatch.bind(this, batch), this.messageTimeout);
  }

  batch.responseTimes.push(latency);
};

Benchmark.prototype.analyzeBatch = function(batch) {
  batch.responseTimes.sort(function(a, b) {
    if (a === b) return 0;
    return (a < b)
      ? -1
      : 1;
  });

  var index = Math.floor(batch.responseTimes.length * this.percentile / 100);
  var responseTime = batch.responseTimes[index];
  var errorRate = ((batch.size - batch.responseTimes.length) / batch.size * 100).toFixed(2);

  console.error(
    '%s percentile response time for %d messages: %d (%d% error rate)',
    this.percentile,
    batch.responseTimes.length,
    responseTime,
    errorRate
  );

  this.responseTimes = [];
  this.errorCounter = 0;
  this.messageCounter = 0;
};

Benchmark.prototype.handleConnect = function(client) {
  this.connectedCounter++;
};

Benchmark.prototype.handleError = function(client, error) {
  var index = this.clients.indexOf(client);
  if (index === -1) return;

  console.error(error.message);

  this.clients.splice(index, 1);
  this.connectedCounter--;
  this.connectClient();

  client.disconnect();
};

var benchmark = Benchmark.create(options);
benchmark.start();
