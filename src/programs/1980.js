const { room, myId, run } = require('../helpers/helper')(__filename);

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
} else if (name === "olympians") {
room.assert(`wish spotify:artist:0ZPqGxW2iwZz7vGJWzuTUi would be played on Spotify`)
} else if (name === "glaspy") {
room.assert(`wish spotify:album:2Bq3X3NF39gvmAihzX1DdK would be played on Spotify`)
} else if (name === "badbadnotgood") {
room.assert(`wish spotify:artist:65dGLGjkw3UbddUg2GKQoZ would be played on Spotify`)
} else if (name === "beachbunny") {
room.assert(`wish spotify:artist:2vnB6tuQMaQpORiRdvXF9H would be played on Spotify`)
} else if (name === "catheaven") {
room.assert(`wish spotify:album:0Z9NeEvqeecaLCFUmI4uDw would be played on Spotify`)
} else if (name === "khruangbin") {
room.assert(`wish spotify:artist:2mVVjNmdjXZZDvhgQWiakk would be played on Spotify`)
} else if (name === "khruangbin") {
room.assert(`wish spotify:playlist:6AZ2QTgPu7eCIDZlClIqPa would be played on Spotify`)
} else if (name === "emei") {
room.assert(`wish spotify:track:1rbpKQH9Ln0ySrOV3wtWV7 would be played on Spotify`)
}


    });
  }
  room.subscriptionPostfix();
})




run();
