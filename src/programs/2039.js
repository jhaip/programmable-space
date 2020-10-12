const { room, myId, run } = require('../helper2')(__filename);

let minuteDelay = 5;

room.on(`time is $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ t }) => {

let offset = t % (60*minuteDelay);
if (offset === 0) {
  room.assert(`wish ribbon moved every 50 ms`)
} else if (offset == 5) {
  room.assert(`wish ribbon moved every 1000 ms`)
}


    });
  }
  room.subscriptionPostfix();
})


run();
