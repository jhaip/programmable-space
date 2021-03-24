const getElement = (id) => document.getElementById(id);
const addMessage = (message) => {
  const pTag = document.createElement('p');
  pTag.appendChild(document.createTextNode(message));
  getElement('messages').appendChild(pTag);
};
const ws = new WebSocket('ws://localhost:3030');
ws.onopen = () => { 
  console.log('Now connected'); 
};
ws.onmessage = (event) => {
  const messages = JSON.parse(event.data);
  messages.forEach(addMessage);
};
const fire = (msg) => {
  ws.send(`${msg}`);
};
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