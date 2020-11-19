const { room, myId, run } = require('../helpers/helper')(__filename);

const delay = 100;
let x = 0;
let y = 0;
let vx = 5;
let N = 1000;

function draw() {
  room.cleanup()
  x = (x + vx) % 500;
  let ill = room.newIllumination();
  ill.fill(255, 0, 0);
  ill.rect(x, y, 100, 100);
  room.draw(ill);
  room.flush();
  N -= 1;
  if (N < 0) { return; }
  setTimeout(() => {
    draw();
  }, delay);
}

draw();



run();
