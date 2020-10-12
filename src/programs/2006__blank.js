const { room, myId, run } = require('../helper2')(__filename);

room.on(`$ says the humidity is $H and temp is $T`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ H, T }) => {
if (H > 50) {
  room.assert(`I wish I was highlighted red`)
} else {
  room.assert(`I wish I was highlighted green`)
}

    });
  }
  room.subscriptionPostfix();
})


run();
