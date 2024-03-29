const { room, myId, MY_ID_STR, run } = require('../helpers/helper')(__filename);
const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const fs = require('fs');
const os = require("os");
const request = require('request');
const app = express();

// Notes: to run this program without sudo, add your user to the user group that of the /dev/ttyACM* entries
// For me this was the command: sudo adduser jacob dialout
// and then do a reboot to make sure the changes took effect

// const CODE_FILENAME = `/media/${os.userInfo().username}/CIRCUITPY/code.py`; // breaks when running as root
// const CODE_FILENAME = `/media/pi/CIRCUITPY/code.py`;
const CODE_FILENAME = `/media/jacob/CIRCUITPY/code.py`;

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

const printFront = () => {
  if (rfidToCode[activeRFID]) {
    generate_and_upload_code_front_image(rfidToCode[activeRFID][0]);
  } else {
    console.log(`can't print, active RFID ${activeRFID} not in rfidToCode`);
  }
}

function saveCodeToRoom(newCode) {
  if (activeRFID && activeRFID in rfidToCode) {
    const activeProgramName = rfidToCode[activeRFID][0];
    const cleanSourceCode = newCode.replace(/"/g, String.fromCharCode(9787));
    room.assert(`wish "${activeProgramName}" has source code`, ["text", cleanSourceCode]);
    room.flush();
  } else {
    console.log("not saving to room because no RFID present");
  }
}

function saveCodeToBoard(newCode) {
  if (boardConnected) {
    try {
      const data = fs.writeFileSync(CODE_FILENAME, newCode, { flag: 'w+' })
      console.log("done saving.")
    } catch (err) {
      console.error(err)
    }
  } else {
    console.log("cannot save to board because board not connected");
  }
}

socketServer.on('connection', (socketClient) => {
  console.log('connected');
  console.log('client Set length: ', socketServer.clients.size);
  updateUiWithCode({'type': 'RFID', 'data': {'rfid': activeRFID, 'nameAndCode': rfidToCode[activeRFID] || null}});
  // Send initial data to new client
  //socketClient.send(JSON.stringify(messages));

  socketClient.on('message', (message) => {
    console.log(message);
    // TODO: save, print front, print code
    const msg = JSON.parse(message);
    const msgType = msg.type;
    const msgData = msg.data;
    if (msgType === 'PRINT_FRONT') {
      printFront();
    } else if (msgType === 'PRINT_CODE') {
      generate_and_upload_code_image(msgData);
    } else if (msgType === 'SAVE') {
      saveCodeToRoom(msgData);
      saveCodeToBoard(msgData);
    }
  });

  socketClient.on('close', (socketClient) => {
    console.log('closed');
    console.log('Number of clients: ', socketServer.clients.size);
  });
});

/////////////////////////////////////////////////////////////
// Generate code images
/////////////////////////////////////////////////////////////

const { createCanvas, registerFont } = require('canvas');

const PAPER_WIDTH = 570;
const PAGE_SIZE = 440;
const MARGIN = 30;
const TITLE_FONT_SIZE = 36;
var FONT_PATH_BASE = '/usr/share/fonts/';
var FONT_NAME = 'Inconsolata-SemiCondensedMedium.ttf';
if (process.platform === "darwin") {
  FONT_PATH_BASE = '/Users/jacobhaip/Library/Fonts/';
  FONT_NAME = 'Inconsolata for Powerline.otf';
}
const FONT_PATH = FONT_PATH_BASE + FONT_NAME;
registerFont(FONT_PATH, { family: 'Inconsolata', weight: 'normal' });

function generate_and_upload_code_image(text) {
  const lines = text.split("\n");
  const img_height = 20 * (lines.length + 2)
  const canvas = createCanvas(PAPER_WIDTH, img_height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#FFF'
  ctx.textBaseline = "top";
  ctx.fillRect(0, 0, img_height, PAPER_WIDTH)
  // Page edges
  ctx.strokeStyle = '#555';
  for (let y = 0; y < Math.floor(img_height/PAGE_SIZE) + 1; y += 1) {
    ctx.beginPath();
    ctx.lineTo(0, y * PAGE_SIZE);
    ctx.lineTo(PAPER_WIDTH, y * PAGE_SIZE);
    ctx.stroke();
  }
  // Card title
  ctx.font = `16px "Inconsolata"`;
  ctx.fillStyle = '#000';
  lines.forEach((line, i) => {
    ctx.fillText(line, 0, i * 20)  
  })
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('/tmp/1854-code.png', buffer);
  console.log("done generating code image")
  const urlBase = process.env.PROG_SPACE_SERVER_URL || "localhost";
  const url = `http://${urlBase}:5000/file`;
  const formData = {
    'myfile': fs.createReadStream('/tmp/1854-code.png'),
  }
  request.post(url, {formData: formData}, function(err, res, body) {
    console.log(err, body);
    console.log(res.status);
    console.log("done posting code image")
    room.assert(`wish "1854-code.png" would be thermal printed on epson`);
    room.flush();
  });
}

function generate_and_upload_code_front_image(programId) {
  const canvas = createCanvas(PAPER_WIDTH, PAGE_SIZE)
  const ctx = canvas.getContext('2d')
  ctx.rotate(-Math.PI * 0.5);
  ctx.translate(-PAGE_SIZE, 0);
  ctx.fillStyle = '#FFF'
  ctx.textBaseline = "top";
  ctx.fillRect(0, 0, PAGE_SIZE, PAPER_WIDTH)
  // Page edges
  ctx.strokeStyle = '#000';
  ctx.beginPath();
  ctx.lineTo(0, 0);
  ctx.lineTo(0, PAPER_WIDTH);
  ctx.stroke();
  ctx.beginPath();
  ctx.lineTo(PAGE_SIZE - 1, 0);
  ctx.lineTo(PAGE_SIZE - 1, PAPER_WIDTH);
  ctx.stroke();
  // Card title
  ctx.font = `${TITLE_FONT_SIZE}px "Inconsolata"`;
  ctx.fillStyle = '#000';
  ctx.fillText(`#${programId}`, MARGIN, 0)
  // Drawing rectange
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000';
  ctx.strokeRect(MARGIN, TITLE_FONT_SIZE+5, PAGE_SIZE - 2 * MARGIN, PAPER_WIDTH/2);
  ctx.lineWidth = 1;
  // Description
  ctx.font = `$24px "Inconsolata"`;
  ctx.fillText("DESCRIPTION:", MARGIN, PAPER_WIDTH/2 + TITLE_FONT_SIZE+5 + 10)
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

var activeRFID = "";

var portPaths = ['/dev/ttyACM0', '/dev/ttyACM1'];
if (process.platform === "darwin") {
  portPaths = ['/dev/tty.usbmodem144101'];
}
portPaths.forEach(portPath => {
  const port = new SerialPort(portPath, { baudRate: 9600, autoOpen: false });
  const parser = port.pipe(new Readline({ delimiter: '\n' }));
  const openPort = () => {
    port.open(err => {
      if (err) {
        console.log('Error opening port: ', err.message)
        port.close(closeErr => {
          if (closeErr) console.log("Close error", closeErr);
          setTimeout(openPort, 10*1000);
        })
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
    
    if (data.includes("sending ")) {
      activeRFID = data.replace("sending ", "").trim();
      console.log(`NEW RFID VALUE: ${activeRFID}`);
      updateUiWithCode({'type': 'RFID', 'data': {'rfid': activeRFID, 'nameAndCode': rfidToCode[activeRFID] || null}});
      if (rfidToCode[activeRFID]) {
        // save code to board is RFID card is changed
        saveCodeToBoard(rfidToCode[activeRFID][1]);
      }
    } else {
      const found = data.match(/button (\d) pressed/);
      if (found) {
        const buttonNumber = +found[1];
        if (buttonNumber === 0) {
          printFront();
        } else if (buttonNumber === 1) {
          if (activeRFID in rfidToCode) {
            generate_and_upload_code_image(rfidToCode[activeRFID][1]);
          }
        }
      }
    }
  });
});

/////////////////////////////////////////////////////////////
// CIRCUITPY Drive detection
/////////////////////////////////////////////////////////////

function loadCodeToEditor() {
  fs.readFile(CODE_FILENAME, 'utf8', function(err, data) {
    if (err) {
      console.log("read CIRCUITPY file error:", err);
    } else {
      console.log(data);
      updateUiWithCode({'type': 'BOARD_STATUS', 'data': 'Connected'});
      updateUiWithCode({'type': 'BOARD_CODE', 'data': data});
    }
  });
}

var udev = require("udev");
var boardConnected =  false;

var monitor = udev.monitor("block");
monitor.on('add', function (device) {
  if (device.ID_FS_TYPE && device.ID_FS_LABEL === 'CIRCUITPY') {
    boardConnected = true;
    console.log("added CIRCUITPY device");
    updateUiWithCode({'type': 'BOARD_STATUS', 'data': 'Connecting...'});
    setTimeout(loadCodeToEditor, 500);
  }
});
monitor.on('remove', function (device) {
  if (device.ID_FS_TYPE && device.ID_FS_LABEL === 'CIRCUITPY') {
    boardConnected = false;
    console.log("lost CIRCUITPY device");
    updateUiWithCode({'type': 'BOARD_STATUS', 'data': 'No device.'});
  }
});
// I don't think we need change?
// monitor.on('change', function (device) {
//   console.log('changed ' + device);
// });

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
