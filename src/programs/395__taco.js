const { room, myId } = require('../helper')(__filename);

console.log("start taco")
room.retractMine(`hello from taco @ $`)

setInterval(() => {
  console.error("hello from taco", new Date())
  room
    .retractMine(`hello from taco @ $`)
    .assert(`hello from taco @ ${(new Date()).getTime()}`)
}, 1000);
