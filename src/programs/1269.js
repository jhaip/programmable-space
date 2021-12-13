const { room, myId, run } = require('../helpers/helper')(__filename);

let ill = room.newIllumination()
ill.text(0, 0, "test")
// let u = "https://haiperspace.com/writing/20-02-11-rfid-cards/rfid-card-cover.png"
let lat = -71.1034;
let long = 42.3834;
let zoom = 12.13;
let access_token = process.env.MAPBOX_TOKEN;
let u = `https://api.mapbox.com` +
 `/styles/v1/mapbox/streets-v11/static/` +
 `${lat},${long},${zoom},0/` +
 `300x200` +
 `?access_token=${access_token}`
ill.image(30, 30, 360*4, 240*4, u)
room.draw(ill)




run();
