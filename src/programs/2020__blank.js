const { room, myId, run } = require('../helper2')(__filename);

setInterval(() => {
  room.cleanup()
  room.assert(`time is ${Math.round((new Date()).getTime()/1000)}`)
  room.flush()
}, 800)




run();
