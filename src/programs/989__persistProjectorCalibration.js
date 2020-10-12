const fs = require('fs');
const { room, myId, scriptName, run } = require('../helper2')(__filename);

const savedCalibrationLocation = __filename.replace(scriptName, 'files/projectorCalibration.txt')

fs.readFile(savedCalibrationLocation, 'utf8', function(err, contents) {
  if (err) {
    console.log("No saved calibration data")
    console.error(err);
  } else {
    console.log("loaded initial calibration:")
    console.log(contents);
    console.log(contents.split(/\r?\n/))
    contents.split(/\r?\n/).forEach(line => {
      if (line) {
        room.assert(line);
      }
    });
  }
  // Listen for calibration updates and save them
  console.log("listening for changes to calibration")
  room.onGetSource('wisherId',
    `camera $cameraId has projector calibration TL ($x1, $y1) TR ($x2, $y2) BR ($x3, $y3) BL ($x4, $y4) @ $`,
    results => {
      if (!!results) {
        let serializedData = "";
        results.forEach(({ wisherId, cameraId, x1, y1, x2, y2, x3, y3, x4, y4 }) => {
          serializedData += `camera ${cameraId} has projector calibration TL (${x1}, ${y1}) TR (${x2}, ${y2}) BR (${x3}, ${y3}) BL (${x4}, ${y4}) @ 1`;
          serializedData += "\n";
          if (parseInt(wisherId) === parseInt(myId)) {
            room.retractMine(`camera ${cameraId} has projector calibration %`)
          } else {
            console.log("skipping retract because it was my claim")
          }
        });
        fs.writeFile(savedCalibrationLocation, serializedData, function (err) {
          if (err) return console.log(err)
          console.log("The file was saved!");
        });
      }
    }
  );
  run();
});
