function webConsole(socket, showLoading) {
	
	// If we want to show loading form
	if(showLoading) {
	
		// When the web console is loading
		loading(function() {
			
			whileLoading(socket);
		
		});
	
	} else {
		
		whileLoading(socket);
		
	}
	
	// Logout button
	$('.btn.logout').click(function() {
		Cookies.remove('credentials');
		window.location.href = '/';
	});
	
	// Restart button
	$('.btn.restart').click(function() {
		socket.emit('restart', true);
	});

	// Clear button
	$('.btn.clear').click(function() {
		$('#log-output').html('');
		$('#log-event').html('');
	});
	
}


function whileLoading(socket) {
	
	// Hide the login form
	hideLoginForm();
	
	// Prepare web console displaying
	$('#webconsole').show();
	
	// Update the page title
	updateTitle();

	// On olg logs receiving
	socket.on('getOldLogs', function (oldLogs) {

		var logs_array = oldLogs.split('\n');
		for(var i = 0; i < logs_array.length; i++){
			addLog(null, 'old', logs_array[i], false); //TODo timestamp
		}
	});

	// When the server state changed
	socket.on('serverState', function (serverState) {
		updateServerState(serverState);
	});
	
	// Indicate to the server that user can load some things
	socket.emit('retrieveData');
	
	// When the server emit an output
	socket.on('message', function (msg) {
		
		// Test if it's an event or an output (the type)
		var arr = msg.text.split(' ');
		var res = arr.slice(0, 2);
		var type = res[0];
		
		if(type == 'INFO')
			addLog(msg.type, msg.text, true);
		else if(type == 'EVENT')
			addEvent(arr.slice(1)[0]);
		else
			addLog(msg.type, msg.text, true);
	});
	
}

function convertToLog(type, str) {
	return getDatePrefix(true, false) + ' ' + str;
}

function getDatePrefix(full, ms) {

	var d = new Date();
	var date_str = '[';
	if(full) {
		date_str +=           d.getFullYear()      + '-' +
				    minDigits(d.getMonth() + 1, 2) + '-' +
				    minDigits(d.getDate(), 2)      + ' ';		
	}
	
	date_str += minDigits(d.getHours(), 2)   + ':' +
				minDigits(d.getMinutes(), 2) + ':' +
				minDigits(d.getSeconds(), 2);
	
	if(ms) {
		date_str += ':' + minDigits(d.getMilliseconds(), 3);
		
	}
		
	
	// var date_str = '[' + d.getFullYear()                                         + '-' +
					   // ((d.getMonth() + 1) < 10 ? '0' : '') + (d.getMonth() + 1) + '-' +
						// (d.getDate()       < 10 ? '0' : '') + d.getDate()        + ' ' +
						// (d.getHours()      < 10 ? '0' : '') + d.getHours()       + ':' +
						// (d.getMinutes()    < 10 ? '0' : '') + d.getMinutes()     + ':' +
						// (d.getSeconds()    < 10 ? '0' : '') + d.getSeconds()     +
						// (ms ? ':' + minDigits(d.getMilliseconds(), 3) : '') + ']';
						
	return date_str + ']';
	
}

function addLog(ts, type, str, printDate) {

	var logOutput = $('#log-output');
	var children = logOutput.children();
	
	if(children.size() == 0)
		logOutput.append("<div class='cmd " + type + "'>" + convertToLog(ts, type, str, printDate) + "</div>");
	else
		children.first().before("<div class='cmd " + type + "'>" + convertToLog(ts, type, str, printDate) + "</div>");
	
}

function addEvent(event_str) {
	
	// Compute an unique id
	var id = 'json-renderer-' + Math.round((Math.random() * 10000000), 10000000);

	// Set the name
	var prefix = getDatePrefix(false, true) + ' Event';
	
	// Add a new json renderer
	var logEvent = $('#log-event');
	var children = logEvent.children();
	
	if(children.size() == 0)
		logEvent.append('<pre id="' + id + '"></pre>');
	else
		children.first().before('<pre id="' + id + '"></pre>');

	// Get the renderer
	var jsonRenderer = $('#' + id);
	
	// Deserialize data
	var event = JSON.parse(event_str);
	
	// Put data in the renderer
	jsonRenderer.jsonViewer(event);

	// Collaspe all elements
	var first = false;
	jsonRenderer.find('a.json-toggle').map(function(i, jsonToggle) {
		$(jsonToggle).addClass('collapsed');
	});
	jsonRenderer.find('ul.json-dict').map(function(i, jsonDict) {
		$(jsonDict).hide();
		var str = $(jsonDict).children().size() + ' items';
		$(jsonDict).after('<a href="" class="json-placeholder">' + str + '</a>');
	});
	jsonRenderer.find('ol.json-array').map(function(i, jsonDict) {
		$(jsonDict).hide();
		var str = $(jsonDict).children().size() + ' items';
		$(jsonDict).after('<a href="" class="json-placeholder">' + str + '</a>');
	});
	
	// Add the prefix to the renderer
	jsonRenderer.find('a.json-toggle').first().text(prefix + ' ');
	
	// Bind a new event to show the name when the renderer is collaspe manually
	var isCollapsed = true;
	jsonRenderer.find('a.json-toggle').first().click(function() {
		if(!isCollapsed) {
			console.log(jsonRenderer.find('ul.json-dict').first().next());
		}
		isCollapsed = !isCollapsed;
	});	
	
}

function updateServerState(active) {

	// Update toolbar color and buttons states
	if (active) {
		$('#toolbar').css('background', '#65A33F');
		$('.btn-restart').attr("disabled", true);
	} else {
		$('#toolbar').css('background', '#D23339');
		$('.btn-restart').attr("disabled", false);
	}

}

function updateTitle() {
	
	$.getJSON('./infos.json', function(infos) {			
		document.title = 'Link.IO monitoring console (v' + infos.link_io_server_monitoring.version + ')';
		$('#toolbar span.title').text('Link.IO monitoring console (v' + infos.link_io_server_monitoring.version + ')');
	});

}

function minDigits(n, digits) {

	var str = n + '';
	var length = str.length;
	var i = 0;
	while(i < (digits - length)) {
		str = '0' + str;
		i++;
	}

	return str + '';

}

function getMonitoringServerUrl(func) {
	
	$.getJSON('./infos.json', function(infos) {			
		func(infos.link_io_server_monitoring.url);
	});
	
}
