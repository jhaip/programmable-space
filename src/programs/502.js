const { room, myId, run } = require('../helpers/helper')(__filename);

room.on(`Photon says "SOIL_TEMP" is $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ t }) => {
let ill = room.newIllumination()
ill.text(0, 0, "test")
let lat = -71.1034;
let long = 42.3834;
let zoom = 15.0*t/4082.0;
let access_token = process.env.MAPBOX_TOKEN;
let u = `https://api.mapbox.com` +
 `/styles/v1/mapbox/streets-v11/static/` +
 `${lat},${long},${zoom},0/` +
 `300x200` +
 `?access_token=${access_token}`
ill.image(30, 30, 360*2, 240*2, u)
room.draw(ill)


    });
  }
  room.subscriptionPostfix();
})


run();
