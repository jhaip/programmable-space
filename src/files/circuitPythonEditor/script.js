var activeRfid = "";
var originalRfidCode = "";
var activeProgramEditing = "";

const getElement = (id) => document.getElementById(id);
const $rfidStatus = getElement('rfidStatus');
const $programStatus = getElement('programStatus');
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
    $serialout.innerHTML += `${msgData}<br>`;
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
}