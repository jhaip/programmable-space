const { room, myId, run } = require('../helper2')(__filename);

room.assert(`I wish I was highlighted red`)

/*
room.on(`$ $photon sees color ( $r, $g, $b )`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ photon, r, g, b }) => {
    room.cleanup()
    let r = results[0].r;
    let g = results[0].g;
    let b = results[0].b;
    let scale = x => Math.floor(x * 0.3);
    room.assert(`wish RGB light strand is color ${scale(r)} ${scale(g)} ${scale(b)}`)

    });
  } else {
    room.cleanup()
    room.assert(`wish RGB light strand is color 10 0 0`)
  }
  room.subscriptionPostfix();
})
*/



run();
