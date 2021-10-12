// Written By Brian Geffon
var TCPUtil = { };

TCPUtil.prepareForTransmit = JSON.stringify;
TCPUtil.cleanFromTransmit = JSON.parse;

var TCPProxy = function(socketio_client, encoding, nodelay) {
	var sock_encoding = encoding || 'utf8';
	var opt_nodelay = nodelay || false;
	
	var net = require("net");
	var socket = new net.Socket();
	
	socket.setEncoding(sock_encoding);
	socket.setNoDelay(opt_nodelay);
	
	var client = socketio_client;
	var sock_connected = false;
	var socketio_connected = true; // tcp proxy can only be constructed
								   // after the socketio connection has been established
							
	client.on("disconnect", function() {
		// clean up the tcp connection if it's open.
		socketio_connected = false;
		if(sock_connected)
			socket.destroy(); // since this wasn't a clean end.
		
		sock_connected = false;
		TCPUtil.log("socketio client disconnected.");	
	});
	
	client.on("message", function(data) { // message from client came in
		data = TCPUtil.cleanFromTransmit(data);
		switch(data.action){
			case "connect":
				TCPUtil.log("connect request received: " + data.host + ":" + data.port);
				socket.connect(data.port,data.host);
				break;
			case "disconnect":
				if(sock_connected)
					socket.end();
				break;
			case "data":
				//var raw = data.data;
				var raw = data.data;
				if(data.encoding === 'base64') {
					if(typeof(TCPUtil.base64.decode) === 'function'){
						var base64decoded = TCPUtil.base64.decode(data.data);
						raw = new Buffer(base64decoded, 'binary');
					} else {
						TCPUtil.log("ERROR: NO base64 decoder available.");
					}
				} else { raw = data.data; }
				
				if(sock_connected)
					socket.write(raw);
				break;
			default:
				break;
		}
	});
	
	socket.on("end", function() {
		sock_connected = false;
		if(socketio_connected)
			client.send(TCPUtil.prepareForTransmit({action: "closed"}));
	});
	
	socket.on("connect", function(){	
		sock_connected = true;
		TCPUtil.log("socket connected");
		if(socketio_connected)
			client.send(TCPUtil.prepareForTransmit({action: "connected"}));
	});

	socket.on("data", function(sck_data) {
		TCPUtil.log("data arrived:" + sck_data + ", length: " + sck_data.length );
		if(socketio_connected)
			client.send(TCPUtil.prepareForTransmit({action: "data", encoding: sock_encoding, data: sck_data}));
	});
};

var TCPClient = function(host, port) {
	this.host = host;
	this.port = port;
	
	this._connected_to_socket = false; // are we connected to socketio
	this._connected = false; // do we have a connection to the TCP endpoint
	
	this._callbacks = {};
	
	return this;
};

TCPClient.prototype.emit = function(event, param) {
	if(typeof this._callbacks[event] === 'function')
		this._callbacks[event].call(this, param);
};

TCPClient.prototype.on = function(event, callback) {
	if(typeof callback === 'function')
		this._callbacks[event] = callback;
	return this;
};

TCPClient.prototype.disconnect = function() {
	if(this._connected_to_socket)
		this._socket.send(TCPUtil.prepareForTransmit({action: "disconnect"}));
};

TCPClient.prototype.send = function(senddata, encoding){
	var data_encoding = encoding || 'utf8';
	if(this._connected_to_socket && this._connected){
		this._socket.send(TCPUtil.prepareForTransmit({action: "data", encoding: data_encoding, data: senddata}));
	}
}

TCPClient.prototype.connect = function() {
	var that = this;
	
	// FIXME: there is currently a bug with reconnecting
	// after a TCP connection has been closed, this
	// version currently does not support it...
	
	if(typeof this._socket === "undefined" || this._socket === null)
		this._socket = io.connect();
	
		
	this._socket.on("connect", function(){
		that._connected_to_socket = true;
		that._socket.send(TCPUtil.prepareForTransmit({action: "connect", host: that.host, port: that.port}));
	});
	
	this._socket.on('disconnect', function() { 
		that._connected_to_socket = false;
		that._connected = false;
		that.emit("error", "The socket io connection was lost");
	});
	
	this._socket.on("message", function(data){ 
		data = TCPUtil.cleanFromTransmit(data);
		switch(data.action){
			case "connected":
				that._connected = true;
				that.emit("connected");		
				break;
			case "data":
				that.emit("data", {encoding: data.encoding, data: data.data});
				break;
			case "closed":
				that._connected = false;
				that.emit("closed");
			default:
		}
	});
	
	return this;
};

if (typeof exports !== "undefined" && exports !== null) {
  module.exports = TCPProxy; // we only need to expose TCPProxy to node.js
							 // using a TCPClient wrapper in node would not make any sense.
  TCPUtil.base64 = require('./base64.js');
  TCPUtil.log = function() { }; // supress logging
} else {
  TCPUtil.log = function() { }; //console.log;
}
