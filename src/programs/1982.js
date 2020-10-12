const { room, myId, run } = require('../helper2')(__filename);

var C = [1,0,0,0,1,0,0,0,1];
var D = "1997";

room.on(`nowplaying $ calibration for $displayId is $M1 $M2 $M3 $M4 $M5 $M6 $M7 $M8 $M9`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ displayId, M1, M2, M3, M4, M5, M6, M7, M8, M9 }) => {
C = [+M1, +M2, +M3, +M4, +M5, +M6, +M7, +M8, +M9];
D = `${displayId}`;

    });
  }
  room.subscriptionPostfix();
})

function render(text) {
let ill = room.newIllumination()
ill.set_transform(C[0], C[1], C[2], C[3], C[4], C[5], C[6], C[7], C[8], C[9])
ill.fontsize(150)
ill.text(20, 150, `${text}`)
room.draw(ill, D)
}

room.on(`currently playing Spotify song is $title by $artist @ $t`,
        results => {
  room.subscriptionPrefix(2);
  if (!!results && results.length > 0) {
    results.forEach(({ title, artist, t }) => {
room.cleanup()
render(`${title}\n${artist}`)

    });
  } else {
room.cleanup()
render(`-`)
  }
  room.subscriptionPostfix();
})

room.on(`currently playing Spotify song is nothing @ $t`,
        results => {
  room.subscriptionPrefix(3);
  if (!!results && results.length > 0) {
    results.forEach(({ t }) => {
room.cleanup()
render(`-`)

    });
  }
  room.subscriptionPostfix();
})



run();
