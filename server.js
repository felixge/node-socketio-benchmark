var port            = 3030;
var interval        = 1000;
var duration        = 10 * 1000;
var receivedCounter = 0;
var batch           = 0;
var sockets         = [];
var io              = require('socket.io').listen(port);

io.configure(function() {
  io.set('log level', 1);
});

io.sockets.on('connection', function (socket) {
  sockets.push(socket);
  socket.on('chat.send', function(data) {
    receivedCounter++;
  });
});

setInterval(function() {
  batch++;

  var time = Date.now();

  sockets.forEach(function(socket) {
    socket.emit('chat.msg', {
      msg: 'JavaScript motherfucker. Do you speak it!',
      time: time,
      batch: batch
    });
  });
}, interval);

setInterval(function() {
  console.log('Received %d messages per second', receivedCounter / duration * 1000);
  receivedCounter = 0;
}, duration);
