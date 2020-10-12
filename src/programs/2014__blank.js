const { room, myId, run } = require('../helper2')(__filename);

room.on(`circuit playground "BUTTON_A" has value 0`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({  }) => {

room.assert(`wish circuit playground neopixel 0 had color 0 0 0`)


    });
  }
  room.subscriptionPostfix();
})

room.on(`circuit playground "BUTTON_A" has value 1`,
        results => {
  room.subscriptionPrefix(2);
  if (!!results && results.length > 0) {
    results.forEach(({  }) => {

room.assert(`wish circuit playground neopixel 0 had color 100 0 0`)


    });
  }
  room.subscriptionPostfix();
})


run();
