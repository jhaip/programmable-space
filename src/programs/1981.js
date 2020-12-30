const { room, myId, run } = require('../helpers/helper')(__filename);

room.on(`aruco sees $frame @ $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ frame, t }) => {
// xhen camera sees frame $frame @ $:
// xhen camera "1994" screenshot $frame by $source:
let ill = room.newIllumination()
ill.fontsize(30)
ill.scale(5, 5)
ill.image(0, 0, 192, 108, frame)
room.draw(ill);


    });
  }
  room.subscriptionPostfix();
})


run();
