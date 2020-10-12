const { room, myId, run } = require('../helpers/helper')(__filename);

room.on(`measured latency $t ms at $`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ t }) => {
    let ill = room.newIllumination()
    ill.fontsize(30)
    ill.text(0, 0, `${t}ms\nLAG`)
    room.draw(ill)


    });
  }
  room.subscriptionPostfix();
})


run();
