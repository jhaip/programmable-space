const { room, myId, MY_ID_STR, run } = require('../helpers/helper')(__filename);
const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const fs = require('fs');
const request = require('request');
const gamepad = require("gamepad");
const app = express();

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
  updateUiWithCode({'type': 'RFID', 'data': {'rfid': activeRFID, 'nameAndCode': rfidToCode[activeRFID] || null}});
  // Send initial data to new client
  //socketClient.send(JSON.stringify(messages));

  socketClient.on('message', (message) => {
    console.log(message);
    // TODO: save, print front, print code
    if (message === 'PRINT-FRONT') {
      if (rfidToCode[activeRFID]) {
        generate_and_upload_code_front_image(rfidToCode[activeRFID][0]);
      } else {
        console.log(`can't print, active RFID ${activeRFID} not in rfidToCode`);
      }
    }
  });

  socketClient.on('close', (socketClient) => {
    console.log('closed');
    console.log('Number of clients: ', socketServer.clients.size);
  });
});

/////////////////////////////////////////////////////////////
// Gamepad stuff
/////////////////////////////////////////////////////////////

var joystickValues = ["", "", "", ""];
var activeRFID = "";
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
  // RFID values are encoded using the x,y,z,r_z joystick values that range from -127 to 127
  // Note: This -127 to 127 is less than a full byte so any RFID value that includes "FF" cannot be used
  // And the middle value "7f7f7f7f" is used an the "no rfid card present" value
  // For some reason the "gamepad" library labels them axis 3,4,5,6 and converts the range to 0-1
  // .toString(16) converts the value to hex, which we want to two characters with '0' if needed
  joystickValues[axis - 3] = ('0' + (Math.round(value * 127) + 127).toString(16)).slice(-2);
  if (
    joystickValues[0] !== "" &&
    joystickValues[1] !== "" &&
    joystickValues[2] !== "" &&
    joystickValues[3] !== ""
  ) {
    activeRFID = joystickValues.join("");
    joystickValues = ["", "", "", ""];
    if (activeRFID === "7f7f7f7f") {
      activeRFID = "";
    }
    console.log(`NEW RFID VALUE: ${activeRFID}`);
    console.log(Object.keys(rfidToCode));
    updateUiWithCode({'type': 'RFID', 'data': {'rfid': activeRFID, 'nameAndCode': rfidToCode[activeRFID] || null}});
  }
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
// Generate code images
/////////////////////////////////////////////////////////////

const { createCanvas } = require('canvas');

const PAPER_WIDTH = 570;
const PAGE_SIZE = 440;
const MARGIN = 30;
const TITLE_FONT_SIZE = 36;
// const FONT_PATH_BASE = '/usr/share/fonts/'
const FONT_NAME = 'Inconsolata-SemiCondensedMedium.ttf';
const FONT_PATH_BASE = '/Users/jacobhaip/Library/Fonts/';
const FONT_PATH = FONT_PATH_BASE + FONT_NAME;

function generate_and_upload_code_front_image(programId) {
  const canvas = createCanvas(PAGE_SIZE, PAPER_WIDTH)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#FFF'
  ctx.fillRect(0, 0, PAGE_SIZE, PAPER_WIDTH)
  // Page edges
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.lineTo(0, 0);
  ctx.lineTo(0, PAPER_WIDTH);
  ctx.stroke();
  ctx.beginPath();
  ctx.lineTo(PAGE_SIZE - 1, 0);
  ctx.lineTo(PAGE_SIZE - 1, PAPER_WIDTH);
  ctx.stroke();
  // Card title
  ctx.font = `${TITLE_FONT_SIZE}px ${FONT_NAME}`;
  ctx.fillStyle = '#000';
  ctx.fillText(`#${programId}`, MARGIN, 0)
  // Drawing rectange
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.strokeRect(MARGIN, TITLE_FONT_SIZE+5, PAGE_SIZE - MARGIN, PAPER_WIDTH/2 + TITLE_FONT_SIZE+5);
  ctx.lineWidth = 1;
  // Description
  ctx.font = `$24px ${FONT_NAME}`;
  ctx.fillStyle = '#777';
  ctx.fillText("DESCRIPTION:", MARGIN, PAPER_WIDTH/2 + TITLE_FONT_SIZE+5 + 10)
  // TODO: rotate image
  // img_r=img.rotate(90,  expand=1)
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('/tmp/1854-front.png', buffer);
  console.log("done generating front image")
  const urlBase = process.env.PROG_SPACE_SERVER_URL || "localhost";
  const url = `http://${urlBase}:5000/file`;
  const formData = {
    'myfile': fs.createReadStream('/tmp/1854-front.png'),
  }
  request.post(url, {formData: formData}, function(err, res, body) {
    console.log(err, body);
    console.log(res.status);
    console.log("done posting front image")
    room.assert(`wish "1854-front.png" would be thermal printed on epson`);
    room.flush();
  });
}

/////////////////////////////////////////////////////////////
// serial log
/////////////////////////////////////////////////////////////

// TODO: use serialport library
// https://medium.com/@machadogj/arduino-and-node-js-via-serial-port-bcf9691fab6a
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');

const portPaths = ['/dev/tty.usbmodem144101']; // ['/dev/ttyACM0', '/dev/ttyACM1'];
portPaths.forEach(portPath => {
  const port = new SerialPort(portPath, { baudRate: 9600, autoOpen: false });
  const parser = port.pipe(new Readline({ delimiter: '\n' }));
  const openPort = () => {
    port.open(err => {
      if (err) {
        console.log('Error opening port: ', err.message)
        setTimeout(openPort, 10*1000);
      }
    });
  }
  openPort();
  port.on("open", () => {
    console.log('serial port open');
    updateUiWithCode({'type': 'SERIAL', 'data': `~~~~~ ${portPath} opened`});
  });
  port.on("error", err => {
    console.log('serial port error', err.message);
    updateUiWithCode({'type': 'SERIAL', 'data': `~~~~~ ${portPath} error`});
  });
  port.on("close", err => {
    console.log('serial port closed', err.message);
    updateUiWithCode({'type': 'SERIAL', 'data': `~~~~~ ${portPath} closed`});
    setTimeout(openPort, 10*1000);
  });
  parser.on('data', data =>{
    console.log('got word from arduino:', data);
    updateUiWithCode({'type': 'SERIAL', 'data': data});
  });
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
  }
)

room.cleanupOtherSource(MY_ID_STR);
run();
