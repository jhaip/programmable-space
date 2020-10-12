const { room, myId, run } = require('../helper2')(__filename);

room.on(`calendar $ calibration for $displayId is $M1 $M2 $M3 $M4 $M5 $M6 $M7 $M8 $M9`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ displayId, M1, M2, M3, M4, M5, M6, M7, M8, M9 }) => {

room.cleanup()
let W = 1280
let H = 720
let ill = room.newIllumination()
ill.set_transform(+M1, +M2, +M3, +M4, +M5, +M6, +M7, +M8, +M9)
ill.fill("red")
for (let x=0; x<7; x+=1) {
  for (let y=0; y<5; y+=1) {
    if ((x+y) % 2 === 0) {
      ill.rect(x*W/7, y*H/5, W/7, H/5)
    }
  }
}
room.draw(ill, displayId)


    });
  }
  room.subscriptionPostfix();
})


run();
