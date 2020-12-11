const { room, myId, run } = require('../helpers/helper')(__filename);

var dots = [];
let W = 720;
let H = 950;
let DS = 20;
let L = 0.4;
let MAXN = 100;
let delay = Math.floor(1000/5)

function makeDot() {
  return {
    x: 100 + Math.random()*W,
    y: 0
  }
}

function draw() {
  if (dots.length < MAXN && Math.random() < L) {
    dots.push(makeDot())
  }
  room.cleanup()
  let ill = room.newIllumination()
  for (let i=0; i<dots.length; i+=1) {
    dots[i].y += 15
    dots[i].x += -5 + 10*Math.random()
    if (dots[i].y > H) {
      dots[i] = makeDot()
    }
    ill.ellipse(dots[i].x, dots[i].y, DS, DS);
  }
  room.draw(ill);
  room.flush()
  setTimeout(() => { draw() }, delay)
}
draw()



run();
