const { room, myId, run } = require('../helpers/helper')(__filename);
var request = require('request');

var text = "boston";
var lastResult = "";
let access_token = process.env.MAPBOX_TOKEN;

function search(s) {
  let url = `https://api.mapbox.com/` +
  `geocoding/v5/mapbox.places/${encodeURIComponent(s)}.json` +
  `?access_token=${access_token}`;
  var options = {url, method: 'GET'};
  request(options, function (error, response, body) {
  	if (!!error || response.statusCode !== 200) {
      console.log("ERROR fetcching geolocation")
      console.log(error);
      console.log(response.statusCode)
      console.log(response.body)
      lastResult = `{response.body}`;
    } else {
      room.retractMine(`location of %`);
      console.log(body);
      const jbody = JSON.parse(body);
      if (jbody.features.length > 0) {
          const feature = jbody.features[0];
          const name = feature.place_name;
          const lat = feature.center[0];
          const long = feature.center[1];
	      room.assert(`location of "${name}" is ${lat} lat ${long} long`);
      lastResult = `${name}: ${lat}, ${long}`;
      render();
      }
      room.flush();
    }
  });
}

function render() {
  room.retractMine(`draw graphics %`);
  let ill = room.newIllumination();
  ill.text(50, 50, "Geolookup:")
  ill.text(50, 120, "Press enter to search");
  ill.fontcolor(255, 255, 0);
  ill.text(50, 200, text);
  ill.fontcolor(0, 255, 0);
  ill.text(50, 400, lastResult);
  room.draw(ill);
}

room.on(
  `keyboard $ typed key $key @ $t`,
  results => {
    room.subscriptionPrefix(1);
    results.forEach(({ key }) => {
      text += key;
    })
    render();
    room.subscriptionPostfix();
  }
)

room.on(
  `keyboard $ typed special key $specialKey @ $t`,
  results => {
    room.subscriptionPrefix(1);
    results.forEach(({ specialKey }) => {
      if (specialKey === "space") {
		text += " ";
      } else if (specialKey === "backspace") {
        text = text.slice(0, -1);
      } else if (specialKey === "enter") {
      	search(text);
      }
    });
    render();
    room.subscriptionPostfix();
  }
)

run();