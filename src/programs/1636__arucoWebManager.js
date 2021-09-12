const { room, myId, scriptName, run } = require('../helpers/helper')(__filename);
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3023;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('./src/files/arucoWebManager'))

const savedDataLocation = path.join(__dirname, '..', 'files', 'arucoMap.txt')
const N_FRAMES_UNTIL_DEATH = 3;
var seenArucoTags = [];
var seenArucoCountdown = {};
var arucoToProgramMap = {};

fs.readFile(savedDataLocation, 'utf8', function(err, contents) {
  if (err) {
    console.log("No saved data")
    console.error(err);
  } else {
    console.log("loaded data:")
    console.log(contents);
    let savedArucoToProgramMap = undefined;
    try {
      savedArucoToProgramMap = JSON.parse(contents);
    } catch(e) {
      console.error(e);
    }
    if (savedArucoToProgramMap) {
      arucoToProgramMap = savedArucoToProgramMap;
      room.retractAll(`program $ is aruco $`);
      for (const [arucoId, programId] of Object.entries(arucoToProgramMap)) {
        room.assert(`program ${programId} is aruco ${arucoId}`);
      }
      room.flush();
    }
  }
});

app.get('/status', (req, res) => {
    res.status(200).send({
        'seenArucoTags': seenArucoTags,
        'arucoToProgramMap': arucoToProgramMap,
    });
})

app.post('/map', (req, res) => {
  console.log("update aruco to program map");
  console.log(req.body);
  const data = req.body;
  room.retractAll(`program $ is aruco $`)
  for (const [arucoId, programId] of Object.entries(data)) {
    room.assert(`program ${programId} is aruco ${arucoId}`);
  }
  room.flush();
  res.status(200).send('OK');
})

room.on(`camera $camId sees aruco $id at $x1 $y1 $x2 $y2 $x3 $y3 $x4 $y4 @ $t`,
    results => {
        room.subscriptionPrefix(1);
        seenArucoTags = results || [];
        seenArucoTags.forEach((v, i) => {
          seenArucoCountdown[v.id] = {...v, "countdown": N_FRAMES_UNTIL_DEATH+1};
        })
        for (const arucoId in seenArucoCountdown) {
          seenArucoCountdown[arucoId].countdown -= 1;
          if (seenArucoCountdown[arucoId].countdown <= 0) {
            delete seenArucoCountdown[arucoId];
          } else if (arucoToProgramMap[arucoId]) {
            const r = arucoToProgramMap[arucoId];
            const currentTimeMs = (new Date()).getTime();
            // assume paper is 4 times the size of the aruco card, extended in the -X and -Y direction.
            // so we use (x2, y2) as the origin (the top right corner)
            const scale = 4;
            const px1 = r.x2 + scale*(r.x1 - r.x2);
            const py1 = r.y2 + scale*(r.y1 - r.y2);
            const px2 = r.x2;
            const py2 = r.y2;
            const px3 = r.x2 + scale*(r.x3 - r.x2);
            const py3 = r.y2 + scale*(r.y3 - r.y2);
            const px4 = r.x2 + scale*(r.x1 - r.x2) + scale*(r.x3 - r.x2);
            const py4 = r.y2 + scale*(r.y1 - r.y2) + scale*(r.y3 - r.y2);
            room.assert(`camera ${r.camId} sees paper ${arucoToProgramMap[arucoId]} at TL ( ${px1} , ${py1} ) TR ( ${px2} , ${py2} ) BR ( ${px3} , ${py3} ) BL ( ${px4} , ${py4} ) @ ${currentTimeMs}`)
          }
        }
        room.subscriptionPostfix();
    })

room.on(`program $programId is aruco $arucoId`,
    results => {
        room.subscriptionPrefix(2);
        arucoToProgramMap = (results || []).reduce((acc, v) => {
          acc[v.arucoId] = v.programId;
          return acc;
        }, {});
        room.subscriptionPostfix();
        fs.writeFile(savedDataLocation, JSON.stringify(arucoToProgramMap), function (err) {
          if (err) return console.log(err)
          console.log("The file was saved!");
        });
    })

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
run();
