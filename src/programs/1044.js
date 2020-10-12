const { room, myId, run } = require('../helper2')(__filename);

room.on(`laser in region $regionId`,
        `region $regionId has name tiger`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ regionId }) => {
      let ill = room.newIllumination()
      ill.fontsize(100)
      ill.fontcolor(255, 128, 0)
      ill.text(0, 0, "RAWR!")
      room.draw(ill);
    });
  }
  room.subscriptionPostfix();
})


run();

