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
var seenArucoTags = [];
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

room.on(`camera $camId sees aruco $id at $x1 $y1 $x2 $y2 $x3 $y3 $x4 $y4 @ $`,
    results => {
        room.subscriptionPrefix(1);
        seenArucoTags = results || [];
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

room.on(`camera $camId sees aruco $arucoId at $x1 $y1 $x2 $y2 $x3 $y3 $x4 $y4 @ $`,
    `program $programId is aruco $arucoId`,
    results => {
        room.subscriptionPrefix(3);
        if (!!results) {
          results.forEach(({ programId }) => {
            room.assert(`wish ${programId} would be running`); 
          });
        }
        room.subscriptionPostfix();
    })

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
run();