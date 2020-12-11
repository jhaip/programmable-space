const { room, myId, run } = require('../helpers/helper')(__filename);

const delay = Math.floor(1000/5);
const WIDTH = 900;
const HEIGHT = 500;
let t = 0;
let wiggle = 30;

function draw() {
  room.cleanup()
  t = (t + 1) % 30;
  let ill = room.newIllumination()
  ill.nostroke()
  ill.fill(255, 0, 0)
  for (let x = 0; x < WIDTH; x += 50) {
    for (let y = 0; y < HEIGHT; y += 50) {
      ill.rect(
        50 + x+25-25/2 + wiggle*Math.sin(x+t*2*Math.PI/30),
        50 + y+25-25/2 + wiggle*Math.cos(x+t*2*Math.PI/30),
        25, 25) 
    }
  }
  room.draw(ill);
  room.flush()
  setTimeout(() => { draw() }, delay);
}
draw();

room.on(`Photon says "SOIL_TEMP" is $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ t }) => {
  let v = (+t)/40;
  wiggle = Math.max(1, Math.min(v, 100))

    });
  }
  room.subscriptionPostfix();
})




run();
