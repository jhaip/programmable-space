const { room, myId, run } = require('../helpers/helper')(__filename);

data = []
size = 40

room.on(`time is $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ t }) => {
    data.push(50 + 50*Math.sin(t/1000.0))
    data = data.slice(-size)
    room.assert(`"Sin wave" data is "${data.toString()}"`)

    });
  }
  room.subscriptionPostfix();
})


run();
