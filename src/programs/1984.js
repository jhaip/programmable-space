const { room, myId, run } = require('../helpers/helper')(__filename);

const W = 50;
const H = 100;

room.on(`camera sees subframe $i $frame @ $`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ i, frame }) => {
let ill = room.newIllumination()
ill.image(i*W*2, 0, W*2, H*2, frame)
room.draw(ill)


    });
  }
  room.subscriptionPostfix();
})


run();
