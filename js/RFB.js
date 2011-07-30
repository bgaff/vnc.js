var RFBClient = function(tcp_client) {
	this._tcpClient = tcp_client;
	
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
		this._handshake_complete = false;		
};

RFBClient.prototype.log = function(msg){
	console.log("RFBClient: " + msg);
};

RFBClient.prototype.alert = function(msg){
	alert(msg);
};

RFBClient.prototype.dataReceived = function(data){
	var decodedData = Base64.decodeStr(data.data);
	
	this.log("data received: " + data.data);
	
	if(!this._server_version_received){
		this.handleServerVersion(decodedData);
		return;
	} else if(!this._security_type_received) {
		this.handleAuthentication(decodedData);
		return;
	} else if (this._vnc_challenge_result_sent && !this._authentication_complete){
		this.authenticationResponse(decodedData);
		return;
	}
};

RFBClient.prototype.authenticationResponse = function(data){
	
	if(data.charCodeAt(3) === 1){
		this.alert("Incorrect VNC Authentication Password!");
		this.log("Authentication Failed");
	} else if ( data.charCodeAt(0) === 0 && data.charCodeAt(1) === 0 && data.charCodeAt(2) === 0 && data.charCodeAt(3) === 0 ){
		this._authentication_complete = true;
		this.log("Authentication Complete!");
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
		log('Challenge response ' + resHex);	
		encodedResp = Base64.encodeIntArr(resArr,16);
		log("Challenge encoded: " + encodedResp);
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