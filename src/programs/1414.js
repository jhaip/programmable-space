const { room, myId, run } = require('../helpers/helper')(__filename);

data = []
size = 21

room.on(`measured latency $h ms at $`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ h }) => {
    data.push(h)
    data = data.slice(-size)
    room.assert(`"System Lag" data is "${data.toString()}"`)

    });
  }
  room.subscriptionPostfix();
})


run();
