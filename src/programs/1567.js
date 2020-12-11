const { room, myId, run } = require('../helpers/helper')(__filename);

function draw(v) {
let ill = room.newIllumination()
ill.text(100, 650, v)
ill.text(100, 100, "value = step rotation")
let x = 400;
let y = 600;
let r = 0;
let l = 100;
for (let i=0; i<10; i+=1) {
  let nx = x + l * Math.cos(r);
  let ny = y + l * Math.sin(r);
  ill.line(x,y,nx,ny)
  r += v * Math.PI/200.0;
  x = nx;
  y = ny;
}
room.draw(ill)
}

room.on(`Photon says "SOIL_TEMP" is $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ t }) => {
  let v = (+t)/40;
  draw(v)  

    });
  }
  room.subscriptionPostfix();
})



run();
