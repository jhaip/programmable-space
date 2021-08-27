const { room, myId, run } = require('../helpers/helper')(__filename);

var C = [1, 0, 0, 0, 1, 0, 0, 0, 1];
var CS = {}
var cam_display_map = {}

room.on(`camera $cam calibration for $display is $M1 $M2 $M3 $M4 $M5 $M6 $M7 $M8 $M9`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ cam, display, M1, M2, M3, M4, M5, M6, M7, M8, M9 }) => {
CS[`${cam}`] = [+M1, +M2, +M3, +M4, +M5, +M6, +M7, +M8, +M9]
cam_display_map[`${cam}`] = display
    });
  }
  room.subscriptionPostfix();
})

room.on(`laser seen at $x $y @ $t on camera $cam`,
        results => {
  room.subscriptionPrefix(2);
  if (!!results && results.length > 0) {
    results.forEach(({ x, y, t, cam }) => {

let ill = room.newIllumination()
if (!!CS[cam]) {
  let m = CS[cam];
  ill.set_transform(m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8])
} else {
  ill.set_transform(C[0], C[1], C[2], C[3], C[4], C[5], C[6], C[7], C[8])
}
ill.fill(255, 255, 255)
ill.stroke(255, 0, 0);
ill.ellipse(+x-20, +y-20, 40, 40)
if (!!CS[cam]) {
  room.draw(ill, cam_display_map[`${cam}`])
} else {
  room.draw(ill, "1993")
}


    });
  }
  room.subscriptionPostfix();
})


run();
