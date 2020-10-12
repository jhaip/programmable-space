const { room, myId, run } = require('../helper2')(__filename);

room.on(`there is a cat`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({  }) => {
  room.assert(`i see a cat`)


    });
  }
  room.subscriptionPostfix();
})


run();
