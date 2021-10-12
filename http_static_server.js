//
//
// Simple HTTP Static Content Server
// Written By Brian Geffon (briangeffon {@} gmail {dot} com)
//
//
var sys = require("util"),  
    http = require("http"),
    url = require("url"),  
    path = require("path"),
  	util = sys||require('util'),
    fs = require("fs"),
	qs = require("querystring");

server = function() { 
	var getMimeType = function(extension){
		switch(extension.toLowerCase()){
			case "json":
				return "application/json";
				break;
			case "html":
				return "text/html";
				break; 
			case "js":
				return "text/javascript";
				break;
			case "css":
				return  "text/css";
				break;
			case "txt":
			case "text":
			    return "text/plain";
			    break;
			default:
				return "text/html";
				break;
		}
	};
	
	return http.createServer(function(request, response) {  
		var processRequest = (function(uri,filename,extension,request,response){
			var sendResponse = (function(response, status_code, content_type, data){
					response.statusCode = status_code;
					response.setHeader('Content-Type', content_type);
					response.write(data);
					response.end();
			});
			
		    fs.exists(filename, function(exists) {  
		        if(!exists) {  
			        util.log('err404 on ' + filename);
		       		return sendResponse(response, 404, "text/html", "<html><body><h1>404 - Not Found</h1></body></html>");
		        }  

		        fs.readFile(filename, "binary", function(err, file) {  
		            if(err) {  
						util.log("err500 on " + filename);
		                return sendResponse(response, 500, "text/html", "<html><body><h1>500 - Error</h1></body></html>");
		            }  

					sendResponse(response,200,getMimeType(extension), file);
		        });  
		    });
	   });
	
	   var parsed = url.parse(request.url);
	   var uri = parsed.pathname;  
	   var query = qs.parse(parsed.query);
	   var timeout = query.timeout || 0;
	
	   if(uri == '/') uri = 'index.html';

	   var filename = path.join(process.cwd(), uri);  
	   var extension = filename.substr(filename.lastIndexOf(".") + 1).toLowerCase();
	
	   setTimeout(processRequest, timeout, uri,filename,extension,request,response);
 });
};

module.exports = server;
