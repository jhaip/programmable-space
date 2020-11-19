const { room, myId, run } = require('../helpers/helper')(__filename);

FRAMES = []
currentFrame = 0

room.on(`camera sees subframe $i $frame @ $`,
        results => {
FRAMES = results.slice(0)
FRAMES.sort((a,b) => a["i"] - b["i"])

})

room.on(`time is $t`,
        results => {
  room.subscriptionPrefix(2);
  if (!!results && results.length > 0) {
    results.forEach(({ t }) => {
if (FRAMES.length > 0) {
currentFrame += 1
if (currentFrame >= FRAMES.length) {
  currentFrame = 0;
}
let ill = room.newIllumination()
ill.image(0, 0, 5*50, 5*100, FRAMES[currentFrame]["frame"])
room.draw(ill)
}

    });
  }
  room.subscriptionPostfix();
})




run();
