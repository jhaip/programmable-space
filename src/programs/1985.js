const { room, myId, run } = require('../helpers/helper')(__filename);

let fs = require('fs');
let path = require('path');
let p = n => path.join(__dirname, '..', 'files', n)
let lastFrame = null;

room.on(`camera sees frame $frame @ $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ frame, t }) => {
lastFrame = frame;
room.cleanup()
let ill = room.newIllumination()
ill.scale(5, 5)
ill.image(0, 0, 192, 108, frame)
room.draw(ill);

    });
  }
  room.subscriptionPostfix();
})

room.on(`time is $t`,
        results => {
  room.subscriptionPrefix(2);
  if (!!results && results.length > 0) {
    results.forEach(({ t }) => {
let offset = t % (60*5); // 5 min
if (offset === 0 && !!lastFrame) {
  fs.writeFile(p(`timelapse1985_${t}`), lastFrame, err => {
    if (err) return console.log(err);
    console.log("saved timelapse photo");
  });
  room.cleanup()
  let ill = room.newIllumination()
  ill.fontcolor(0, 255, 0);
  ill.fontsize(200)
  ill.text(0, 0, "SAVED")
  room.draw(ill);
}

    });
  }
  room.subscriptionPostfix();
})



run();
