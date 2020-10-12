const { room, myId, run } = require('../helper2')(__filename);

room.on(`microphone heard $x @ $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ x, t }) => {

if (x.includes("what") && x.includes("time")) {
  let d = (new Date()).toLocaleTimeString('en-US', {'hour': '2-digit', 'minute': '2-digit'})
  room.assert(`wish speaker said`, ["text", `It is ${d}`])
}

    });
  }
  room.subscriptionPostfix();
})


run();
