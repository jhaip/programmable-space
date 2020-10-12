const { room, myId, run } = require('../helper2')(__filename);

room.on(`time is $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ t }) => {

  for (let i=0; i<10; i+=1) {
    let x = ((t % 10) >= 5) ? 5 : 0;
    let y = ((t % 10) >= 5) ? 0 : 5;
    let v = (i>=5) ? x : y;
    room.assert(`wish circuit playground neopixel ${i} had color ${v} ${v} ${v}`)
  }

    });
  }
  room.subscriptionPostfix();
})


run();
