const { room, myId, run } = require('../helper2')(__filename);

room.on(`circuit playground LIGHT has value $x`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ x }) => {

let y = x > 100 ? 200 : 0

room.assert(`wish circuit playground neopixel 2 had color ${y} 0 0`)


    });
  }
  room.subscriptionPostfix();
})


run();
