const express = require('express')
const { room, myId, scriptName, run } = require('../helpers/helper')(__filename);
const request = require('request');
const app = express();
const port = 3021;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('./src/files/frame-to-papers'))

var availableCameras = [];
var allCamerasCalibrationData = {};

app.get('/status', (req, res) => {
    res.status(200).send({
        'cameras': availableCameras,
    });
})

app.get('/frame', (req, res) => {
  var cameraData = availableCameras.find(v => `${v.cameraId}` == `${req.query.id}`);
  if (req.query.id && cameraData) {
    var newurl = cameraData.frameUrl;
    console.log(`proxying to ${newurl}`);
    request(newurl).pipe(res);
  } else {
    res.status(400).send("missing id");  
  }
})

app.get('/cal', (req, res) => {
  res.status(200).send(allCamerasCalibrationData);
})

app.post('/cal', (req, res) => {
  console.log("new cal POST");
  console.log(req.body);
  const data = req.body;
  let cameraId = data.cameraId;
  let cal = data.cal;
  if (!cameraId || !cal) {
    res.status(400).send('missing data');
    return;
  }
  room.retractAll(`camera "${cameraId}" has projector calibration TL ($, $) TR ($, $) BR ($, $) BL ($, $) @ $`)
  room.assert(`camera "${cameraId}" has projector calibration TL (${cal[0]}, ${cal[1]}) TR (${cal[2]}, ${cal[3]}) BR (${cal[4]}, ${cal[5]}) BL (${cal[6]}, ${cal[7]}) @ 0`)
  room.flush();
  res.status(200).send('OK');
})

room.on(`camera $cameraId has projector calibration TL ($x1, $y1) TR ($x2, $y2) BR ($x3, $y3) BL ($x4, $y4) @ $`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
          console.log("new calibration data:");
          console.log(results);
          allCamerasCalibrationData = results.reduce((acc, v) => {
            acc[v.cameraId] = [v.x1, v.y1, v.x2, v.y2, v.x3, v.y3, v.x4, v.y4];
            return acc;
          }, {});
        }
        room.subscriptionPostfix();
    })

room.on(`camera $cameraId frame at $frameUrl`,
    results => {
        room.subscriptionPrefix(2);
        if (!!results) {
            results.sort((a, b) => `${a.cameraId}` < `${b.cameraId}`);
            availableCameras = results;
        }
        room.subscriptionPostfix();
    })

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
run();