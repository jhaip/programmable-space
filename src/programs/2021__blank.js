const { room, myId, run } = require('../helper2')(__filename);

room.on(`time is $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ t }) => {

if ((t % 5) === 0) {
  room.assert(`wish circuit playground played 440 tone`)
}


    });
  }
  room.subscriptionPostfix();
})


run();
