const { room, myId, run } = require('../helper2')(__filename);

room.on(`block code $code wip`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ code }) => {
    let ill = room.newIllumination()
    ill.text(0, 0, "ROBOT CODE:")
    ill.fontsize(7)
    ill.text(0, 10, code);
    room.draw(ill)

    });
  }
  room.subscriptionPostfix();
})


run();
