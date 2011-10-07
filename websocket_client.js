var program = require('commander');
var io      = require('socket.io-client');
var clients = [];

program
  .option('-p, --port [port]', 'The port to connect to [3030]', 3030)
  .option('-h, --host [host]', 'The host to connect to [localhost]', 'localhost')
  .option('-c, --clients [clients]', 'The number of total clients', 1000)
  .option('-m, --messages [messages]', 'The number of messages to send per sec [0.1]', 0.1)
  .parse(process.argv);

function WebsocketClient() {
  this.connection       = null;
  this.receivedMessages = 0;
}

WebsocketClient.prototype.connect = function() {
  this.connection = io.connect(
    'http://' + program.host + ':' + program.port,
    {'force new connection': true}
  );

  this.connection.on('chat.msg', this.handleChatMessage.bind(this));
}

WebsocketClient.prototype.sendMsg = function() {
  if (this.connection.socket.connected) {
    this.connection.emit('chat.send', {msg: 'Your mum'});
  }
}

WebsocketClient.prototype.handleChatMessage = function(data) {
  this.receivedMessages++;
}

WebsocketClient.prototype.sendMessages = function() {
  var that = this;
  setInterval(function() {
    that.sendMsg();
  }, 1000 / program.messages);
}

for (var i = 0; i < program.clients; i++) {
  var client = new WebsocketClient();
  client.connect();
  client.sendMessages();
  clients.push(client);
}

setInterval(function() {
  var sum              = 0;
  var receivedMessages = clients.map(function(client) {
    var messageCount = client.receivedMessages;
    client.receivedMessages = 0;

    return messageCount;
  });

  receivedMessages.forEach(function(count) {
    sum += count;
  });

  console.log('Received %d requests per second', sum / 10000 * 1000)
}, 10000);
