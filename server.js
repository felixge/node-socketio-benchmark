var port            = 3030;
var interval        = 1000;
var duration        = 1 * 1000;
var receivedCounter = 0;
var batch           = 0;
var sockets         = [];
var io              = require('socket.io').listen(port);

io.configure(function() {
  io.set('log level', 1);
});

io.sockets.on('connection', function (socket) {
  sockets.push(socket);
  socket
    .on('disconnect', function() {
      sockets.splice(sockets.indexOf(socket), 1);
    })
    .on('chat.send', function(data) {
      receivedCounter++;
    });
});

setInterval(function() {
  batch++;

  var time = Date.now();
  var size = sockets.length;

  sockets.forEach(function(socket, i) {
    socket.emit('chat.msg', {
      msg: 'JavaScript motherfucker. Do you speak it!',
      time: time,
      batch: batch,
      size: size
    });
  });
}, interval);

setInterval(function() {
  console.log('Received %d clients, %d messages per second', sockets.length, receivedCounter / duration * 1000);
  receivedCounter = 0;
}, duration);
