const { room, myId, run } = require('../helper2')(__filename);

room.assert(`wish circuit playground neopixel 9 had color 0 0 0`)

room.on(`there is a cat`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({  }) => {

  room.assert(`wish circuit playground neopixel 9 had color 100 50 0`)


    });
  } else {

  room.assert(`wish circuit playground neopixel 9 had color 0 0 0`)


  }
  room.subscriptionPostfix();
})


run();
