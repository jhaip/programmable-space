const { room, myId, run } = require('../helper2')(__filename);

room.on(`laser in region $r @ $t`,
        `region $r has name $name`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ r, t, name }) => {

if (name === "albumcb") {
room.assert(`wish spotify:album:3l7JWewI3ZByxaT5BCgRx2 would be played on Spotify`)
} else if (name === "albumpsy") {
room.assert(`wish spotify:track:4YxA2ymhdsh2ROqfkUxmxJ would be played on Spotify`)
} else if (name === "albumrwo") {
room.assert(`wish spotify:track:2hIwKcLHchJXjgFe2lxA2P would be played on Spotify`)
} else if (name === "albumwiddit") {
room.assert(`wish spotify:track:2L9mXwt6vJ3FxVxf7jsGkd would be played on Spotify`)
}


    });
  }
  room.subscriptionPostfix();
})




run();
