const { room, myId, run } = require('../helpers/helper')(__filename);

room.on(`measured latency $t ms at $`,
        results => {
  console.log("NEW RESULTS");
  console.log(results);
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ t }) => {
    let ill = room.newIllumination()
    ill.fontsize(300)
    ill.fontcolor("white")
    ill.text(0, 0, `${t}ms\nLAG`)
    room.draw(ill)


    });
  }
  room.subscriptionPostfix();
})


run();
