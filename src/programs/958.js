const { room, myId, run } = require('../helpers/helper')(__filename);

function draw(v) {
let ill = room.newIllumination()
ill.nofill()
ill.stroke(255, 0, 0)
ill.strokewidth(5)
ill.rect(50, 300+1080, 500, 100)
ill.fill(255, 0, 0)
ill.rect(50, 300+1080, 500*v, 100)
if (v > 0.99) {
  ill.fontcolor(255, 255, 0)
  ill.fontsize(80)
  ill.text(55, 300+1080, "Gas is full")
}
room.draw(ill, "1567")
}

room.on(`Photon says "SOIL_TEMP" is $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ t }) => {
  draw(t/4082)

    });
  }
  room.subscriptionPostfix();
})



run();
