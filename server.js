var util = require('util'),
	sio = require('socket.io'),
	HTTPServer = require("./http_static_server"),
	TCPProxy = require("./JSTCP/jstcp")

var server = new HTTPServer();
server.listen(1024);

var io = sio.listen(server);
io.set('log level', 0);
io.sockets.on('connection', function(client){ 
	var proxy = new TCPProxy(client, 'base64'); // create a new TCPProxy and pass it the client
									  			// and TCPProxy will handle everything :D
});

util.log("Sever is listening on localhost:1024.");