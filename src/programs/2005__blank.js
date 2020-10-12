const { room, myId, run } = require('../helper2')(__filename);

room.onGetSource('source', `I wish I was highlighted $color`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ color, source }) => {
  let ill = room.newIllumination()
  ill.fill(color)
  ill.rect(0, 0, 1920, 1080);
  room.draw(ill, source)


    });
  }
  room.subscriptionPostfix();
})


run();
