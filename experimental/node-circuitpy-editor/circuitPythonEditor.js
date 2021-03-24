const express = require('express');
const path = require('path');
const WebSocket = require('ws'); // new
const app = express();
var gamepad = require("gamepad");

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

const port = 8765;
app.listen(port, () => {
  console.log(`listening http://localhost:${port}`);
});

const updateUiWithCode = () => {
  socketServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify([message]));
    }
  });
}

const socketServer = new WebSocket.Server({port: 3030});

socketServer.on('connection', (socketClient) => {
  console.log('connected');
  console.log('client Set length: ', socketServer.clients.size);
  // Send initial data to new client
  //socketClient.send(JSON.stringify(messages));

  socketClient.on('message', (message) => {
    console.log(message);
    // TODO: save, print front, print code
  });

  socketClient.on('close', (socketClient) => {
    console.log('closed');
    console.log('Number of clients: ', socketServer.clients.size);
  });
});

/////////////////////////////////////////////////////////////
// Gamepad stuff
/////////////////////////////////////////////////////////////

// Initialize the library
gamepad.init()
 
// List the state of all currently attached devices
for (var i = 0, l = gamepad.numDevices(); i < l; i++) {
  console.log(i, gamepad.deviceAtIndex());
}
 
// Create a game loop and poll for events
setInterval(gamepad.processEvents, 16);
// Scan for new gamepads as a slower rate
setInterval(gamepad.detectDevices, 500);
 
// Listen for move events on all gamepads
gamepad.on("move", function (id, axis, value) {
  console.log("move", {
    id: id,
    axis: axis,
    value: value,
  });
});
 
// Listen for button up events on all gamepads
gamepad.on("up", function (id, num) {
  console.log("up", {
    id: id,
    num: num,
  });
});
 
// Listen for button down events on all gamepads
gamepad.on("down", function (id, num) {
  console.log("down", {
    id: id,
    num: num,
  });
});

/////////////////////////////////////////////////////////////
// serial log
/////////////////////////////////////////////////////////////

// TODO

/////////////////////////////////////////////////////////////
// Prog space stuff
/////////////////////////////////////////////////////////////

// TODO