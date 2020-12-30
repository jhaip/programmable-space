const { room, myId, run } = require('../helpers/helper')(__filename);

let fs = require('fs');
let path = require('path');
let p = path.join(__dirname, '..', 'files')
let pf = n => path.join(__dirname, '..', 'files', n)
let ffiles = [];
let currentFrame = 0;
const DELAY = 150;

fs.readdir(p, (err, files) => {
  ffiles = files.filter(name =>
    name.indexOf("timelapse1985_") !== -1)
  console.log(ffiles);
  ffiles = ffiles.map(name => {
    return fs.readFileSync(pf(name), 'utf8').trim()
  })
});

function draw() {
room.cleanup();
let ill = room.newIllumination()
ill.fontcolor(255, 255, 0)
ill.fontsize(10)
if (!ffiles || ffiles.length === 0) {
  ill.text(0, 0, "No frames") 
} else {
  currentFrame += 1;
  if (currentFrame >= ffiles.length) {
    currentFrame = 0;
  }
  if (ffiles[currentFrame]) {
  ill.scale(5, 5)
  ill.image(0, 0, 192, 108, ffiles[currentFrame])
  ill.text(0, 0, `${currentFrame}/${ffiles.length}`)
  }
}
room.draw(ill)
room.flush()
setTimeout(() => { draw(); }, DELAY)
}
draw()





run();
