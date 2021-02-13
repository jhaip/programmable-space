const { room, myId, run } = require('../helpers/helper')(__filename);



room.on(`location of $title is $lat lat $long long`,
        `Photon says "SOIL_TEMP" is $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ title, lat, long, t }) => {
let ill = room.newIllumination()
let zoom = 15.0*t/4082.0;
let access_token = process.env.MAPBOX_TOKEN;
let u = `https://api.mapbox.com` +
 `/styles/v1/mapbox/streets-v11/static/` +
 `${lat},${long},${zoom},0/` +
 `300x200` +
 `?access_token=${access_token}`
ill.image(30, 30, 360*2, 240*2, u)
ill.text(0, 0, title);
room.draw(ill)


    });
  }
  room.subscriptionPostfix();
})


run();
