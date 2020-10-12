const { room, myId, run } = require('../helpers/helper')(__filename);

const DELAY_MS = 500;

function tick() {
  room.cleanup()
  room.assert(`time is ${(new Date()).getTime()}`)
  let ill = room.newIllumination()
  ill.text(0, 100, "I am a clock")
  room.draw(ill);
  room.flush();
  setTimeout(tick, DELAY_MS);
}

tick();



run();
