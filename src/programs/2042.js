const { room, myId, run } = require('../helper2')(__filename);

room.on(`draw graphics $graphics on 1101`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ graphics }) => {

room.assert(`draw graphics`, ["text", graphics], `on web2`)


    });
  }
  room.subscriptionPostfix();
})


run();
