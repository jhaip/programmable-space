const { room, myId, run } = require('../helper2')(__filename);

room.on(`camera sees frame $frame @ $`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ frame }) => {
    let ill = room.newIllumination()
    ill.fontsize(30)
    ill.image(0, 0, 192, 108, frame)
    room.draw(ill)
    });
  }
  room.subscriptionPostfix();
})

run();

