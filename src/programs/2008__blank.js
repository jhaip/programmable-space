const { room, myId, run } = require('../helpers/helper')(__filename);

room.on(`time is $time`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ time }) => {
  if (Math.floor(time/1000) % 2 === 0) {
    room.assert(`I wish I was highlighted orange`)
  }

    });
  }
  room.subscriptionPostfix();
})


run();
