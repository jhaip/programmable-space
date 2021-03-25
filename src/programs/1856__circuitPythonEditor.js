const { room, myId, MY_ID_STR, run } = require('../helpers/helper')(__filename);
const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const app = express();
const gamepad = require("gamepad");

app.use(express.static('./src/files/circuitPythonEditor'))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './src/files/circuitPythonEditor/index.html'));
});

const httpPort = 8765;
app.listen(httpPort, () => {
  console.log(`listening http://localhost:${httpPort}`);
});

const updateUiWithCode = message => {
  console.log("sending UI with code")
  socketServer.clients.forEach((client) => {
    console.log("sending")
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    } else {
      console.log("cliient not ready")
    }
  });
}

const socketServer = new WebSocket.Server({port: 3030});

socketServer.on('connection', (socketClient) => {
  console.log('connected');
  console.log('client Set length: ', socketServer.clients.size);
  updateUiWithCode({'type': 'CODE', 'data': rfidToCode});
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

// TODO: use serialport library
// https://medium.com/@machadogj/arduino-and-node-js-via-serial-port-bcf9691fab6a
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const port = new SerialPort('/dev/ttyACM0', { baudRate: 9600 });
const parser = port.pipe(new Readline({ delimiter: '\n' }));
// Read the port data
port.on("open", () => {
  console.log('serial port open');
});
parser.on('data', data =>{
  console.log('got word from arduino:', data);
});

/////////////////////////////////////////////////////////////
// Prog space stuff
/////////////////////////////////////////////////////////////

var rfidToCode = {};

room.onRaw(
  "$ $ paper $targetId has RFID $rfid",
  "$ $ $targetName has paper ID $targetId",
  "$ $ $targetName has source code $sourceCode",
  results => {
    let rfidToSourceCode = {};
    if (results) {
      results.forEach(result => {
        rfidToSourceCode[result["rfid"]] = [
          result["targetName"],
          result["sourceCode"].replace(
            new RegExp(String.fromCharCode(9787), 'g'),
            String.fromCharCode(34)
          )
        ];
      })
    }
    rfidToCode = rfidToSourceCode;
    updateUiWithCode({'type': 'CODE', 'data': rfidToCode});
  }
)

room.cleanupOtherSource(MY_ID_STR);
run();
