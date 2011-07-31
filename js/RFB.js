var RFBClient = function(tcp_client, rfb_canvas) {
	this._tcpClient = tcp_client;
    this._rfbCanvas = rfb_canvas;
	this.processor = new FrameBufferProcessor(this);
	
	/* first stage of hand shake: version exchange */
		this._server_version_received = false;
		this._client_version_sent = false;
	 	this._server_rfb_version_string = '';
	
	/* second stage of hand shake: security negotiation */
		this._security_type_received = false;
	
	/* because we're implementing RFB 3.3, this can only be one of the above.*/ 
		this.VNC_AUTH_INVALID = 0;
		this.VNC_AUTH_NONE = 1;
		this.VNC_AUTH_VNCAUTHENTICATION = 2;
		this._security_type = this.VNC_AUTH_INVALID;
	 
	/* we are either handling a VNC_AUTH_VNCAUTHENTICATION or hand shake is complete */
		this._vnc_auth_challenge = '';
		this._vnc_challenge_result_sent = false;
		this._authentication_complete = false;
		
	/* during initialization phase */
		this._vnc_client_init_sent = false;
		this._vnc_server_init_received = false;
	
	/* server init data */
		this._framebuffer_width = 0;
		this._framebuffer_height = 0;
		
		this._server_name_length = 0;
		this._server_name = '';
		
	/* PIXEL_FORMAT, pg 17 */
		this._bits_per_pixel = 0;
		this._depth = 0;
		this._big_endian_flag = 0;
		this._true_color_flag = 0;
		this._red_max = 0;
		this._green_max = 0;
		this._blue_max = 0;
		this._red_shift = 0;
		this._green_shift = 0;
		this._blue_shift = 0;
		
	/* now we're done with handshaking */
		this._handshake_complete = false;	

	/* VNC Constants */
	this.RFB_FRAME_BUFFER_UPDATE_REQUEST = 3;
	this.RFB_FRAME_BUFFER_UPDATE = 0;
	this.VNC_SET_PIXEL_FORMAT = 0;
	this.VNC_SET_ENCODINGS = 2;
	
	this.RFB_ENCODING_RAW = 0;
	this.RFB_ENCODING_COPYRECT = 1;

	/* Callback Event Constants */
	this.VNC_SERVER_INIT_COMPLETE = 0;
	this.VNC_FRAME_BUFFER_UPDATE = 1;
	this.VNC_FRAME_BUFFER_COPYRECT = 2;
	
	this._callbacks = {};
	
	this._processing_buffer = false;
	this._total_bytes_expected = 0;
	this._buffer = [];
	this._rectangles_to_process = 0;
	this._x = 0;
	this._y = 0;
	this._w = 0;
	this._h = 0;
	this._bail = false;
};

RFBClient.prototype.log = function(msg){
	console.log("RFBClient: " + msg);
};

RFBClient.prototype.alert = function(msg){
	alert(msg);
};

RFBClient.prototype.setEncodings = function(){
	// tell the server we support both RAW and CopyRect encoding formats.
	var request = [0,0,0,0,0,0,0,0];
	request[0] = this.VNC_SET_ENCODINGS;
	request[3] = 1;
	request[7] = this.RFB_ENCODING_COPYRECT;
	
	var encodedRequest = Base64.encodeIntArr(request);
	this.log("Encoding request: " + encodedRequest);
	this._tcpClient.send(encodedRequest,'base64');
}

RFBClient.prototype.frameBufferUpdateRequest = function(x, y, width, height, incremental){

	var incremt = incremental || 0; // for now we're not going to deal with incremental updates
	
	var request = [0,0,0,0,0,0,0,0,0,0];
	request[0] = this.RFB_FRAME_BUFFER_UPDATE_REQUEST;
	request[1] = incremt;
	
	// we have to determine the hi and lo bytes for x, y, width, and height.
	// they are all 16bit values so we have to break them up into parts
	// to work correctly
	request[3] = (x & 0xFF);
	request[2] = ((x & 0xFF00) >> 8);
	request[5] = (y & 0xFF);
	request[4] = ((y & 0xFF00) >> 8);
	request[7] = (width & 0xFF);
	request[6] = ((width & 0xFF00) >> 8);
	request[9] = (height & 0xFF);
	request[8] = ((height & 0xFF00) >> 8);
	
	var encodedRequest = Base64.encodeIntArr(request);
	this._tcpClient.send(encodedRequest,'base64');
};

RFBClient.prototype.handleServerInit = function(data){
		var width = (data.charCodeAt(0) << 8 | data.charCodeAt(1));
		var height = (data.charCodeAt(2) << 8 | data.charCodeAt(3));
		this._framebuffer_width = width;
		this._framebuffer_height = height;
		
		this.log("Server Init, FrameBuffer Width: " + width + ", " + "Height: " + height);
		
		var name_length = (data.charCodeAt(20) << 24 | data.charCodeAt(21) << 16 | data.charCodeAt(22) << 8 | data.charCodeAt(23));
		var name = data.substr(24, name_length);
		this._server_name_length = name_length;
		this._server_name = name;
		
		this.log("Server Init, Server Name: " + this._server_name + " (length: " + this._server_name_length + ")");
		
		this._bits_per_pixel = data.charCodeAt(4);
		this._depth = data.charCodeAt(5);
		this._big_endian_flag = data.charCodeAt(6) & 0xFF;
		this._true_color_flag = data.charCodeAt(7) & 0xFF;
		this._red_max = (data.charCodeAt(8) << 8 | data.charCodeAt(9));
		this._green_max = (data.charCodeAt(10) << 8 | data.charCodeAt(11));
		this._blue_max = (data.charCodeAt(12) << 8 | data.charCodeAt(13));
		this._red_shift = data.charCodeAt(14);
		this._green_shift = data.charCodeAt(15);
		this._blue_shift = data.charCodeAt(16);
		
		this.log("Server Init, Bits Per Pixel: " + this._bits_per_pixel + ", Depth: " + this._depth + ", Big endian flag: " + this._big_endian_flag);
		this.log("Server Init, True Color Flag: " + this._true_color_flag + ", Red Max: " + this._red_max + ", Green Max: " + this._green_max + ", Blue Max: " + this._blue_max);
		this.log("Server Init, Red Shift: " + this._red_shift + ", Green Shift: " + this._green_shift + ", Blue Shift: " + this._blue_shift);
		
		//this.setEncodings(); /* tell the server we support CopyRect and Raw */
			
		this._vnc_server_init_received = true; // We're fucking ready to roll!
		this._handshake_complete = true;
		this.frameBufferUpdateRequest(0,0,1152,720);
		
		var that = this;
		var frameBufferUpdate = function(){
			that.frameBufferUpdateRequest(0,0,1152,720,1);
		}
		
		setInterval(frameBufferUpdate,250); /* incremental update requests */
		
		
		this.emit(this.VNC_SERVER_INIT_COMPLETE);
};

RFBClient.prototype.clientInit = function(){
	// send a nonzero byte to tell the server we're willing to share the screen
	this._vnc_client_init_sent = true;
	var clientInitMsg = [1];
	var clientInitEncoded = Base64.encodeIntArr(clientInitMsg, 1);
	this.log("Client Init Msg: " + clientInitEncoded);
	this._tcpClient.send(clientInitEncoded,'base64');
};

RFBClient.prototype.dataReceived = function(data){
	var decodedData = Base64.decodeStr(data.data);
	//var decodedArr = Base64.decodeArr(data.data);
	var decodedIntArr = Base64.decodeIntArr(data.data);
	
	this.log("decodedDatalen :" + decodedData.length + ", arrLen: " + decodedIntArr.length );
	
	if(!this._server_version_received){
		this.handleServerVersion(decodedData);
		return;
	} else if(!this._security_type_received) {
		this.handleAuthentication(decodedData);
		return;
	} else if (this._vnc_challenge_result_sent && !this._authentication_complete){
		this.authenticationResponse(decodedData);
		return;
	} else if (!this._vnc_server_init_received && this._vnc_client_init_sent) {
		this.handleServerInit(decodedData);
		return;
	} else if (this._handshake_complete) {
		this.processor.dataArrived(decodedIntArr);
	}
};


var FrameBufferProcessor = function(_rfbClient) {
	this.rfbClient = _rfbClient;
	this.global_buffer = [];
	this.header_received = false;
	this.number_rects_remaining = 0;
	
	this.current_rect_header_received = false;
	this.current_rect_buffer = [];
	this.current_rect_bytes_left = 0;
	this.current_rect_x = 0;
	this.current_rect_y = 0;
	this.current_width = 0;
	this.current_height = 0;
	this.current_copyrect = false;
	
	this.dataArrived = function(dataIntArr){
		this.global_buffer = this.global_buffer.concat(dataIntArr); /* we're already running, just tack this on */
		
		if(!this.header_received){
			// the first 12 bytes are going to be our header information.
			this.header_received = true;
			this.number_rects_remaining = (	this.global_buffer[2] << 8) | 	this.global_buffer[3];
			this.global_buffer = this.global_buffer.slice(4, this.global_buffer.length);
			console.log("Expecting " + this.number_rects_remaining + " rectangles");
		} 
		
		this.process();
	};
	
	this.process = function() {
		if(!this.current_rect_header_received){
			// read the rect header
			var x_pos = (this.global_buffer[0] << 8) | this.global_buffer[1];
			var y_pos = (this.global_buffer[2] << 8) | this.global_buffer[3];
			var width = (this.global_buffer[4] << 8) | this.global_buffer[5];
			var height = (this.global_buffer[6] << 8) | this.global_buffer[7];
			var encodingType = ((this.global_buffer[8] << 24) | 
							   (this.global_buffer[9] << 16) |
							   (this.global_buffer[10] << 8)  |
							   (this.global_buffer[11]));
							
			this.current_rect_x = x_pos;
			this.current_rect_y = y_pos;
			this.current_width = width;
			this.current_height = height;
			var blah = this.global_buffer.splice(0, 12);
			console.log("Current Rect: x:" + x_pos + ", y:" + y_pos + ", width: " + width + ", height: " + height);
			if(encodingType === this.rfbClient.RFB_ENCODING_COPYRECT){
				console.log("COPYRECT RECEIVED!!");
				this.current_copyrect = true;
				this.current_rect_bytes_left = 4;
			} else {
			 this.current_rect_header_received = true;
			 this.current_rect_bytes_left = width * height * 4; /* shouldn't be hard coded, but whatever */
			}
			if(this.global_buffer.length > 0)
			 this.process();
		} else {
			if(this.global_buffer.length >= this.current_rect_bytes_left){
				// we have enough data to render our rect.
				var rect = this.global_buffer.splice(0, this.current_rect_bytes_left);
				if(!this.current_copyrect){
					this.rfbClient.emit(this.rfbClient.VNC_FRAME_BUFFER_UPDATE, {x: this.current_rect_x, y: this.current_rect_y, w: this.current_width, h: this.current_height, data: rect});
				} else {
				  var src_x_pos = (rect[0] << 8) | rect[1];
				  var src_y_pos = (rect[2] << 8) | rect[3];
				  console.log("Copy recting src_x:" + src_x_pos + ", src_y:" + src_y_pos + ", to_x:" + this.current_rect_x + ", to_y:" + this.current_rect_y + ", width: " + this.current_width + ", height: " + this.current_height);
				  this.rfbClient.emit(this.rfbClient.VNC_FRAME_BUFFER_COPYRECT, {x: this.current_rect_x, y: this.current_rect_y, w: this.current_width, h: this.current_height , src_x: src_x_pos, src_y: src_y_pos});
				}
				this.current_rect_bytes_left = 0;
				this.current_rect_header_received = false;
				this.current_copyrect = false;
				
				if(--this.number_rects_remaining <= 0){
				 console.log("All rects processed!!!");
				 this.header_received = false;
				 this.number_rects_remaining = 0;
				 if(this.global_buffer.length > 0)
				 {
				  this.dataArrived([]);
				 }
			     else
				  return;
			    }
				else
				 this.process();
			}
		}
	};
	
};

RFBClient.prototype.authenticationResponse = function(data){
	if(data.charCodeAt(3) === 1){
		this.alert("Incorrect VNC Authentication Password!");
		this.log("Authentication Failed");
	} else if ( data.charCodeAt(0) === 0 && data.charCodeAt(1) === 0 && data.charCodeAt(2) === 0 && data.charCodeAt(3) === 0 ){
		this._authentication_complete = true;
		this.log("Authentication Complete!");
		this.clientInit();
	}
};

RFBClient.prototype.handleAuthentication = function(data){
	var sec_type = data.charCodeAt(3);
	this._security_type = sec_type;
	this._security_type_received = true;
	
	if(this._security_type === this.VNC_AUTH_INVALID){
		var error_reason = data.substr(4);
		this.log("VNC Authentication could not be negotiated, the reason the server gave: " + error_reason);
		this._tcpClient.disconnect(); // end the connection
		return;
	} else if(this._authentication_complete === this.VNC_AUTH_NONE) {
		this.log("No Authentication is required...Authentication Complete");
		 this._authentication_complete = true;
		 return;
	} else if(this._security_type === this.VNC_AUTH_VNCAUTHENTICATION){
		this.log("Authentication type is VNC Authentication");
		var vnc_auth_password = prompt("Please enter the VNC Password");
		
		// For some reason the RFB documentation doesn't mention this, but the
		// VNC software actually mirrors all bits in the bytes of the key
		// supplied by the user before running it through DES. Mirriong
		// means that 01001110 becomes 01110010. The following is a cool trick, trust me :P -Brian
		var vnc_8_byte_key_arr_int = [0,0,0,0,0,0,0,0];
		for(i = 0; i < 8; i++){
			if(i < vnc_auth_password.length){
				var char_at = vnc_auth_password.charCodeAt(i);					
				var new_char = ((((char_at * 0x0802 & 0x22110) | (char_at * 0x8020 & 0x88440)) * 0x10101 >> 16) & 0xFF);  
				vnc_8_byte_key_arr_int[i] = new_char;
			}
		}
		
		// take our challenge and turn it into an int array to give to DES
		var correctChallengelo_int   =  [];
		var correctChallengehi_int   =  [];
		for(i = 0; i < 16; i++){
			if(i < 8) {
			 correctChallengelo_int[i] = data.charCodeAt(i+4);
			} else {
			 correctChallengehi_int[i-8] = data.charCodeAt(i+4);
			}
		}
		
		this.log("VNC Authentication challenge: " + correctChallengelo_int + ":" + correctChallengehi_int);
		
		var des = new DES(vnc_8_byte_key_arr_int);
		res_lo = des.encrypt(correctChallengelo_int);
		des = new DES(vnc_8_byte_key_arr_int);
		res_hi = des.encrypt(correctChallengehi_int);
		
		var resArr = [];
		var resHex = [];
		for(i = 0; i < 16; i++){
			if(i < 8){
				resArr[i] = res_lo.charCodeAt(i);
				resHex[i] = resArr[i].toString(16);
			} else {
				resArr[i] = res_hi.charCodeAt(i-8);
				resHex[i] = resArr[i].toString(16);
			}
		}
		this.log('Challenge response ' + resHex);	
		encodedResp = Base64.encodeIntArr(resArr,16);
		this.log("Challenge encoded: " + encodedResp);
		this._vnc_challenge_result_sent = true;
		this._tcpClient.send(encodedResp,'base64');
		return;
	}
};

RFBClient.prototype.handleServerVersion = function(data){
	if(data.substr(0,3) === 'RFB'){ /* string manipulation like this is safe for certain operations */
		this._server_rfb_version_string = data.substr(4,7);
		this._server_rfb_version_major = parseInt(data.substr(4,3));
		this._server_rfb_version_minor = parseInt(data.substr(8,3));
		this._server_version_received = true;
		this.log("Server Version RFB: " + this._server_rfb_version_string);
	 	this.log("Sending Client Version RFB 3.3"); // send our version to the server...
		this._tcpClient.send("RFB 003.003\n"); // we will implement a simple version of RFB (v3.3)
		this._client_version_sent = true;
	}
};

RFBClient.prototype.emit = function(event, param) {
	if(typeof this._callbacks[event] === 'function')
		this._callbacks[event].call(this, param);
};

RFBClient.prototype.on = function(event, callback) {
	if(typeof callback === 'function')
		this._callbacks[event] = callback;
	return this;
};
