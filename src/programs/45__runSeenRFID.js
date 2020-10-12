const { room, myId, run } = require('../helper2')(__filename);

room.on(`$photonId read $value on sensor $sensorId`,
        `paper $paperId has RFID $value`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ photonId, value, sensorId, paperId }) => {
      room.assert(`wish ${paperId} would be running`); 
      room.assert(`default display for ${paperId} is 1999`)
      room.assert(`paper ${paperId} has width ${1024} height ${600} angle 0 at (0, 0)`);
    });
  }
  room.subscriptionPostfix();
})

room.on(`Photon200038000747343232363230 read $value on sensor 1`,
        `paper $paperId has RFID $value`,
  results => {
    room.subscriptionPrefix(2);
    if (!!results) {
      results.forEach(({ value, paperId }) => {
        room.assert(`paper 1013 is pointing at paper ${paperId}`);
      });
    }
    room.subscriptionPostfix();
  })

room.on(`ArgonBLE read $value on sensor 1`,
  `paper $paperId has RFID $value`,
  results => {
    room.subscriptionPrefix(3);
    if (!!results) {
      results.forEach(({ value, paperId }) => {
        room.assert(`paper 1013 is pointing at paper ${paperId}`);
      });
    }
    room.subscriptionPostfix();
  })

run();
