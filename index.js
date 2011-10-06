var port            = 3030;
var interval        = 1000;
var duration        = 10 * 1000;
var receivedCounter = 0;
var sockets         = [];
var io              = require('socket.io').listen(port);

io.sockets.on('connection', function (socket) {
  sockets.push(socket);
  socket.on('chat.send', function(data) {
    receivedCounter++;
  });
});

setInterval(function() {
  sockets.forEach(function(socket) {
    socket.emit('chat.msg', {
      msg: 'JavaScript motherfucker. Do you speak it!'
    });
  });
}, interval);

setInterval(function() {
  console.log('Received %d requests per second', receivedCounter / (duration * 1000));
  receivedCounter = 0;
}, duration);