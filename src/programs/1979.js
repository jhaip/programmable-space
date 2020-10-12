const { room, myId, run } = require('../helper2')(__filename);

room.on(`laser in region $r @ $t`,
        `region $r has name album1`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ r, t }) => {
// It's Alright by Horsebeach
room.assert(`wish spotify:track:0ZAdCDeysyoh5BOpuSGKy3 would be played on Spotify`)


    });
  }
  room.subscriptionPostfix();
})


run();
