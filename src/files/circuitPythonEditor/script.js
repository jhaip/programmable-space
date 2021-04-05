var activeRfid = "";
var originalRfidCode = "";
var activeProgramEditing = "";
var serialLinesSinceLastClear = 0;
const MAX_SERIAL_LINES = 2000; // to prevent browser from running out of memory

const getElement = (id) => document.getElementById(id);
const $rfidStatus = getElement('rfidStatus');
const $programStatus = getElement('programStatus');
const $boardStatus = getElement('boardStatus');
const $serialout = getElement('serialout');
var myCodeMirror = CodeMirror(getElement("editor"), {
  value: '',
  mode: "python",
  lineNumbers: true,
  scrollbarStyle: "simple",
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
    serialLinesSinceLastClear += 1;
    if (serialLinesSinceLastClear > MAX_SERIAL_LINES) {
      clearSerial();
    }
    $serialout.innerHTML += `${msgData}<br>`;
    $serialout.scrollTop = $serialout.scrollHeight;
  } else if (msgType === 'BOARD_STATUS') {
    $boardStatus.innerHTML = msgData;
  } else if (msgType === 'BOARD_CODE') {
    myCodeMirror.setValue(msgData);
  }
};
const fire = (type, data) => {
  ws.send(JSON.stringify({type, data}))
};
const printCode = () => fire('PRINT_CODE', myCodeMirror.getValue());
const printFront = () => fire('PRINT_FRONT', null);
const saveCode = () => fire('SAVE', myCodeMirror.getValue());

function clearSerial() {
  $serialout.innerHTML = '';
  serialLinesSinceLastClear = 0;
}
