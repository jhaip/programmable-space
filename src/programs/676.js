const { room, myId, run } = require('../helper2')(__filename);


room.on(`button was pressed @ $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ t }) => {
    room.assert(`I wish I was highlighted green`)
    setTimeout(() => {
      room.cleanup()
      room.flush()
    }, 500);

    });
  }
  room.subscriptionPostfix();
})


run();
