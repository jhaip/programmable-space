const { room, myId, run } = require('../helper2')(__filename);

data = []
size = 20

room.on(`measured latency $h ms at $`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ h }) => {
    data.push(h)
    data = data.slice(-size)
    room.assert(`"System Lag" data is "${data.toString()}"`)

    });
  }
  room.subscriptionPostfix();
})


run();
