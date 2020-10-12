const { room, myId, run } = require('../helper2')(__filename);

room.on(`microphone heard $x @ $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ x, t }) => {
if (x.includes("hello")) {
  room.assert(`wish speaker said "Happy Friday"`)
}



    });
  }
  room.subscriptionPostfix();
})


run();
