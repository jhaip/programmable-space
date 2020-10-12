const { room, myId, run } = require('../helper2')(__filename);

let lowMoisture = 500;
let highMoisture = 1000;

room.on(`Photon says "SOIL_MOISTURE" is $M`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ M }) => {

let P = 100 * (M - lowMoisture) / (highMoisture - lowMoisture)
P = Math.floor(Math.min(100, Math.max(0, P)))
P = 100 - P
// invert so lamp is bright when soil is dry
room.assert(`wish plant lamp was at ${P} percent`)


    });
  }
  room.subscriptionPostfix();
})


run();
