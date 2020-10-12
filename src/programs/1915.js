const { room, myId, run } = require('../helper2')(__filename);

room.on(`microphone heard $x @ $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ x, t }) => {

let ill = room.newIllumination()
ill.fontsize(80)
ill.stroke("white")
ill.text(0, 0, "Microphone heard:")
ill.text(0, 120, x)
room.draw(ill)


    });
  }
  room.subscriptionPostfix();
})


run();
