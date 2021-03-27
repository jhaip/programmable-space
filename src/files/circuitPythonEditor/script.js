var activeRfid = "";
var originalRfidCode = "";
var activeProgramEditing = "";

const getElement = (id) => document.getElementById(id);
const $rfidStatus = getElement('rfidStatus');
const $programStatus = getElement('programStatus');
const $serialout = getElement('serialout');
var myCodeMirror = CodeMirror(getElement("editor"), {
  value: `import time
import board
import analogio
from progspace_room import Room

room = Room(use_debug=True)

while True:
    while room.connected():
        room.cleanup()
        room.claim('temp is {}'.format(5))
        time.sleep(1)
`,
  mode: "python",
  lineNumbers: true,
  theme: 'ayu-dark',
});
const ws = new WebSocket('ws://localhost:3030');
ws.onopen = () => { 
  console.log('Now connected'); 
};
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  const msgType = message["type"];
  const msgData = message["data"];
  if (msgType === 'RFID') {
    console.log(msgData);
    activeRfid = msgData.rfid;
    if (msgData.nameAndCode) {
      activeProgramEditing = msgData.nameAndCode[0];
      originalRfidCode = msgData.nameAndCode[1];
      myCodeMirror.setValue(originalRfidCode);
    } else {
      activeProgramEditing = "";
      originalRfidCode = "";
    }
    $rfidStatus.innerHTML = activeRfid;
    $programStatus.innerHTML = activeProgramEditing;
  } else if (msgType === 'SERIAL') {
    console.log(`SERIAL: ${msgData}`);
    $serialout.innerHTML += `${msgData}<br>`;
  }
};
const fire = (msg) => {
  ws.send(`${msg}`);
};

function clearSerial() {
  $serialout.innerHTML = '';
}