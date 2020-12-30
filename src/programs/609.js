const { room, myId, run } = require('../helpers/helper')(__filename);

let idx = 2, idy = 7;
let lastv = [0, 0];
let pts = [[300, 300]];
let T = 3 * Math.PI * 2 / 360;
function draw() {
  let ill = room.newIllumination()
  let lastPt = pts[0];
  for (let i=0; i<pts.length; i+=1) {
    ill.line(lastPt[0], lastPt[1],
             pts[i][0], pts[i][1])
    lastPt = pts[i];
  }
  room.draw(ill)
}

function update(v, q) {
  let lastPt = pts[pts.length-1];
  let diff = Math.abs(v-lastv[q]);
  if (diff > Math.PI) {
    diff = Math.PI * 2 - diff;
  }
  let sign = (
   (v-lastv[q]>=0 && v-lastv[q] <= Math.PI) ||
   (v-lastv[q] <= -Math.PI && v-lastv[q] >= -Math.PI*2))
   ? 1 : -1;
  diff *= sign;
  if (Math.abs(diff) > T) {
    if (q===0) {
      pts.push([lastPt[0]+10*sign, lastPt[1]])
    } else {
      pts.push([lastPt[0], lastPt[1]-10*sign]) 
    } 
    lastv[q] = v;
  }
}

room.on(`aruco $id has value $v`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ id, v }) => {
if (id === idx) {
  update(v, 0)
}
if (id === idy) {
  update(v, 1);
}
draw()


    });
  }
  room.subscriptionPostfix();
})


run();
