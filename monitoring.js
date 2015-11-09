var spawn = require('child_process').spawn;
var http = require('http');
var serveStatic = require('serve-static');
var finalHandler = require('finalhandler');
var request = require('request');

// Necessary to get the configs
var configurator = require('./lib/configurator.js')();
var version = configurator.getLinkIOMonitoringServerVersion();

// Generate public infos file
configurator.generatePublicInfosFile();

// Configuration
var port = configurator.getLinkIOMonitoringServerPort();
var script_path = configurator.getLinkIOServerScript();
var script_arguments = configurator.getLinkIOServerArguments();
var logsUrl = 'http://' + configurator.getLinkIOServerHost() + ':' + configurator.getLinkIOServerPort();

// State signal
var server = http.createServer(function(req, res) {
    var done = finalHandler(req, res);
    serve(req, res, done);
});

// Serve static files
var serve = serveStatic("./client/");

// Initialize socket.io
var io = require('socket.io')(server);

// Start server in the good port
server.listen(port);
console.log('Link.io.server.monitoring (v' + version + ') started on *:' + port);

// Server state
var serverState = false;

// Server socket
var socketServer = undefined;

// On user connection
io.on('connection', function (socket) {
    var firstAuth = true;
    var isAuth = false;


    if(socket.handshake.query.user == 'server') {
        socketServer = socket;

        socketServer.on('event', function(event) {
            console.log(event.type);
            io.to('auth-room').emit('event', event);
        })
    }
    else if(socket.handshake.query.user == 'client') {
        // On user auth-ask
        socket.on('checkCredentials', function (credentials) {

            // Check credentials
            isAuth = configurator.checkCredentials(credentials.login, credentials.password);
            socket.emit('resCheckCredentials', isAuth);

            // If the user is authentificated
            if (isAuth && firstAuth) {
                firstAuth = false;

                console.log('New authentificated client : ' + socket.request.connection.remoteAddress);

                socket.join('auth-room');

                socket.on('retrieveData', function () {

                    // Send old logs
                    sendOldLogs(socket);

                    // Emit server state
                    socket.emit('serverState', serverState);

                });

                // Allow the user to restart the server after a crash
                socket.on('restart', function () {

                    if (!serverState)
                        execScript(script_path, script_arguments);

                })

            }

        });
    }
});

function sendOldLogs(socket) {

    request(logsUrl, function(err, res, oldLogs) {

        // Send old logs
        socket.emit('getOldLogs', oldLogs);

    });

}

// Exec the command and handle std
function execScript(file, args) {

    serverState = true;
    io.to('auth-room').emit('serverState', serverState);

    console.log('Command executed : "node ' + file + '".');

    // Run node with the child.js file as an argument
    var child = spawn('node', [file].concat(args));


    child.stdout.on('data', function (data) {
        io.to('auth-room').emit('message', {'type' : 'debug', 'text' : data+''});
    });


    // Listen for any errors:
    child.stderr.on('data', function (data) {

        console.log('There was an error: ' + data);
        child.kill('SIGINT');

        serverState = false;
        io.to('auth-room').emit('serverState', serverState);
        io.to('auth-room').emit('message', {'type' : 'error', 'text' : data+''});


    });

}

execScript(script_path, script_arguments);
