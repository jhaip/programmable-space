const { room, myId, run } = require('../helper2')(__filename);

data = []
size = 20

room.on(`$ says the humidity is $h and temp is $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ h, t }) => {
    data.push(h)
    if (data.length > size) {
        data = data.slice(-size)
    }
    room.assert(`"Humidity" data is "${data.toString()}"`)

    });
  }
  room.subscriptionPostfix();
})


run();
