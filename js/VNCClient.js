var VNCClient = function(canvas) {
	this._rfb_canvas = new RFBCanvas(canvas);
};

VNCClient.prototype.serverInitComplete = function(rfb_client) {
	this._rfb_canvas.resize(rfb_client._framebuffer_width,
			rfb_client._framebuffer_height);
	document.title = rfb_client._server_name;
};

VNCClient.prototype.frameBufferUpdate = function(rfb_client, update) {
	console.log("LOL");
};

VNCClient.prototype.bindEvents = function(rfb_client) {
	var vnc = this;
	rfb_client.on(rfb_client.VNC_SERVER_INIT_COMPLETE, function() {
		vnc.serverInitComplete(this);
	});
	rfb_client.on(rfb_client.VNC_FRAME_BUFFER_UPDATE, function(update) {
		vnc.frameBufferUpdate(this, update);
	});
};

VNCClient.prototype.connect = function(host, port) {
	//
	//  Establish the TCP connection and pass it to the RFB Client
	//
	var log = function(msg) { console.log(msg) };

	var host = "127.0.0.1";
	var port = 5900;

	var sock = new TCPClient(host,port);
	var rfb_client = new RFBClient(sock);
	this.bindEvents(rfb_client);

	sock.on("connected", function() {
		log("connected to " + host + ":" + port);
	});

	sock.on("closed", function() {
		log("The connection has <strong>closed</strong> :(");
	});

	sock.on("data", function(msg){
		//log("data arrived: " + msg.data);
		if(msg.encoding === 'base64'){
			rfb_client.dataReceived(msg);
		}
	});

	sock.connect();
};
