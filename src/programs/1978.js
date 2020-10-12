const { room, myId, run } = require('../helper2')(__filename);

room.on(`time is $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ t }) => {
if (t%10 === 0) {
  room.assert(`wish currently Spotify song would be updated`)
}

    });
  }
  room.subscriptionPostfix();
})

room.on(`currently playing Spotify song is $title by $artist @ $t`,
        results => {
  room.subscriptionPrefix(2);
  if (!!results && results.length > 0) {
    results.forEach(({ title, artist, t }) => {
let ill = room.newIllumination()
ill.fontsize(50)
ill.fontcolor(100, 100, 150)
ill.text(20, 20, "Currently playing:")
ill.text(20, 140, `${title}`)
ill.text(20, 260, `${artist}`)
room.draw(ill)

    });
  } else {
drawNothingPlaying();
  }
  room.subscriptionPostfix();
})

room.on(`currently playing Spotify song is nothing @ $t`,
        results => {
  room.subscriptionPrefix(3);
  if (!!results && results.length > 0) {
    results.forEach(({ t }) => {
drawNothingPlaying();

    });
  }
  room.subscriptionPostfix();
})

function drawNothingPlaying(){ 
let ill = room.newIllumination()
ill.fontsize(100)
ill.fontcolor(100, 100, 100)
ill.text(20, 20, "Nothing playing")
room.draw(ill)
}



run();
