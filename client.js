var MAX_MESSAGES = { max: 150, bufferZone: 75 };
var DEBUG = { showRenderTime: false };

var socket = io.connect('/');

socket.on('messageQueue', recieveMessage);
setInterval(updatePage, 1500);

function cloneVideo(domId, socketId)
{
	var video = document.getElementById(domId);
	var clone = video.cloneNode(false);
	clone.id = "remote" + socketId;
	document.getElementById('videos').appendChild(clone);
	videos.push(clone);
	return clone;
}

function removeVideo(socketId)
{
	var video = document.getElementById('remote' + socketId);
	if(video)
	{
		videos.splice(videos.indexOf(video), 1);
		video.parentNode.removeChild(video);
	}
}

var videos = [];

setTimeout(init, 0);
function init()
{
	var PeerConnection = window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection || window.mozRTCPeerConnection || window.RTCPeerConnection;

	if(PeerConnection)
	{
		rtc.createStream({"video": true, "audio": true}, function(stream)
		{
			document.getElementById('you').src = URL.createObjectURL(stream);
			document.getElementById('you').play();
		});

//		rtc.SERVER = "STUN stun.internetcalls.com";

		rtc.connect('wss://example.com:8888');

		rtc.on('add remote stream', function(stream, socketId)
		{
			console.log("ADDING REMOTE STREAM...");
			var clone = cloneVideo('you', socketId);
			document.getElementById(clone.id).setAttribute("class", "");
			rtc.attachStream(stream, clone.id);
//			subdivideVideos();
		});

		rtc.on('disconnect stream', function(data)
		{
			console.log('remove ' + data);
			removeVideo(data);
		});
	}
}

var showEvents = { showData: true };
var theData = [];

function clearOutput()
{
	var element = document.getElementById('outputArea');

	clipOutputText(element, 0, 0);
}

function clipOutputText(element, maxMessages, bufferZone)
{
	var count = (element['innerHTML'].match(/<br>/g)||[]).length;
	var total = maxMessages + bufferZone;

	if(total === 0)
	{
		element.innerHTML = '';
	}
	else if(count > (maxMessages + bufferZone))
	{
		var outputTextRendered = element.innerHTML;

		outputTextRendered = outputTextRendered.split('<br>').splice(count - maxMessages, maxMessages).join('<br>')+'<br>';

		element.innerHTML = outputTextRendered;
	}
}

function appendContent(from, to)
{
	var element;
	while(element = from.firstChild)
	{
		from.removeChild(element);
		to.appendChild(element);
	}
}

function scrollPage()
{
	window.scrollTo(0, document.body.scrollHeight);
}

function toggleShowEvents(event)
{
	showEvents[event.id] = event.checked;
}

function requestResponse(data)
{
	socket.emit('data', { data: data } );
}

function renderLinks(messageData)
{
	var rendered = messageData.replace(/([^\s\(\[\"\>\<\;]|^)[^\s]{3,5}:\/\/([^\s\)\]\<\>]+|$)/g, function(match)
	{
		return ich.link({ url: match });
	});

	return rendered;
}

function trueOrUndefined(thing)
{
	return (thing || (thing === undefined))
}

function updatePage()
{
	var outputText = [];
	var ichData = null;
	var THEData = theData;
	theData = [];

	if(DEBUG.showRenderTime)
	{
		var t1 = new Date();
	}

	if(THEData)
	for (var i = 0, maxi = THEData.length; i < maxi; i++)
	{
		ichData = null;

		switch(THEData[i].type)
		{
			case 'data':
				if(showEvents['showData'])
				{
					ichData = ich.data({ data: THEData[i].data });
				}
			break;

			default:
				console.log(THEData[i]);
			break;
		}

		if(ichData) outputText.push(ichData);
	}

	if(outputText)
	if(outputText.length > 0)
	{
		var oldData = document.getElementById('outputArea');

		var newData = document.createElement('div');
		newData.innerHTML = outputText.join('');
		appendContent(newData, oldData);

		clipOutputText(oldData, MAX_MESSAGES.max, MAX_MESSAGES.bufferZone);
		scrollPage();
	}

	if(DEBUG.showRenderTime)
	{
		var t2 = new Date();
		var tdiff = t2 - t1;
		console.log('Render Time: %s ms', tdiff);
	}
}

function recieveMessage(data)
{
	var message;
	for(entry in data)
	{
		message = data[entry];

		switch(message.type)
		{
			case 'data':
				theData.push({ type: 'data', data: message.data });
			break;

			default:
				theData.push({ type: 'NotImplemented' });
			break;
		}
	}
}
