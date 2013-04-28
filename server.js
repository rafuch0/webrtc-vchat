#!/usr/bin/env node

var DEBUG = { normal: true };
var CONFIG = { prompt: 'webrtc-vchat~# ', standalone: true, https: true, ports: { https: 8888, http: 8887 }, webrtcports: { https: 9999, http: 9998 } };

var http = require('http');
var https = require('https');
//var io = require('socket.io');
var util = require('util');
var fs = require('fs');
var repl = require('repl');
var path = require('path');
var webRTC = require('webrtc.io');

var server;
//var rtcserver;
if(CONFIG.standalone)
{
	if(CONFIG.https)
	{
		var serverCerts = {
			key: fs.readFileSync('ServerConfig/server.key'),
			cert: fs.readFileSync('ServerConfig/server.cert')
		};

		server = https.createServer(serverCerts, ServerMain);
		server.listen(CONFIG['ports'].https);

//		rtcserver = https.createServer(serverCerts);
//		rtcserver.listen(CONFIG['webrtcports'].https);
	}
	else
	{
		server = http.createServer(ServerMain);
		server.listen(CONFIG['ports'].http);

//		rtcserver = http.createServer();
//		rtcserver.listen(CONFIG['webrtcports'].http);
	}
}
else
{
	server = http.createServer();
	server.listen('1337');

//	rtcserver = http.createServer();
//	rtcserver.listen('1338');
}

//var socket = io.listen(server);
//setupSocketIOOptions();
//setupSocketIOEventHandlers();

//webRTC.listen(rtcserver);

webRTC.listen(server);
setupWebRTCIOEventHandlers();

var clientCount = 0;
var messageQueue = [];

var myRepl = repl.start({ input: process.stdin, output: process.stdout, prompt: CONFIG.prompt, useGlobal: true, ignoreUndefined: true, terminal: true, useColors: true });
myRepl['context'].DEBUG = DEBUG;

//setInterval(broadcastMessages, 1500);

function setupWebRTCIOEventHandlers()
{
}

function setupSocketIOEventHandlers()
{
	socket.on('connection', NewClient);
}

function setupSocketIOOptions()
{
	socket.enable('browser client minification');
	socket.enable('browser client etag');
	socket.enable('browser client gzip');
	socket.set('log level', 0);
	if(DEBUG.packets) socket.set('log level', 3);
	socket.set('transports',
	[
			'websocket',
			'flashsocket',
			'htmlfile',
			'xhr-polling',
			'jsonp-polling'
	]);
}

process.on('SIGINT', function()
{
	cleanUp();

	setTimeout(process.exit, 1000);
});

function cleanUp()
{
}

function getContentType(uri)
{
	var extension = uri.substr(-3);

	switch(extension)
	{
		case 'htm':
		case 'tml':
			return 'text/html';
		break;

		case 'css':
			return 'text/css';
		break;

		case '.js':
			return 'text/javascript';
		break;
	}
}

function ServerMain(request, response)
{
	var request_uri = './'+path.normalize('./'+((request.url == '' || request.url == '/')?'index.html':request.url));

	fs.exists(request_uri, function(exists)
	{
		if(exists)
		{
			fs.readFile(request_uri, function(error, content)
			{
				if(error)
				{
					response.writeHead(500);
					response.end();
				}
				else
				{
					response.writeHead(200, { 'Content-Type': getContentType(request_uri) });
					response.end(content, 'utf-8');
				}
			});
		}
		else
		{
			response.writeHead(404);
			response.end();
		}
	});	
}

function NewClient(client)
{
	client.messageQueue = [];

	client.join('general');
	client.join('users');

	clientCount = socket.sockets.clients('users').length;
	console.log('Client Count: ' + clientCount);

	client.on('disconnect', function()
	{
		clientCount = socket.sockets.clients('users').length;
		console.log('Client Count: ' + clientCount);
	});
}

function clone(data)
{
	return JSON.parse(JSON.stringify(data));
}

function getPadding(str, padCount, padChar)
{
	var pads = padCount - (str.toString().length + 1);

	if(pads > 0)
	{
		return Array(pads).join(padChar);
	}
	else
	{
		return '';
	}
}

function queueClientMessage(client, data)
{
	client['messageQueue'].push(data);
}

function queueMessage(data)
{
	if(DEBUG.packets) console.log('%s', util.inspect(data));

	messageQueue.push(data);
}

function broadcastMessages()
{
	if(messageQueue.length > 0)
	{
		socket.sockets.in('general').volatile.emit('messageQueue', messageQueue);
		messageQueue = [];
	}

	var clients = socket.sockets.clients('users');
	if(clients.length > 0)
	{
		for(var i=0, maxi = clients.length; i < maxi; i++)
		{
			var client = clients[i];

			if(client['messageQueue'].length > 0)
			{
				client.volatile.emit('messageQueue', client.messageQueue);
				client.messageQueue = [];
			}
		}
	}
}
