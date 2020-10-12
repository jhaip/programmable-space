const { room, myId, run } = require('../helper2')(__filename);

const PW = 1280
const PH = 720
var ill;

function xRect(y, w ,h, xp) {
  let p = xp ? xp : 0.666;
  ill.stroke(255, 50,0 )
  ill.rect(PW*0.5-w*0.5, y, w, h)
  ill.stroke("white")
  ill.line(PW*0.5-w*0.5, y+h*p, PW*0.5+w*0.5, y+h*p)
}

room.on(`paper2 $ calibration for $displayId is $M1 $M2 $M3 $M4 $M5 $M6 $M7 $M8 $M9`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ displayId, M1, M2, M3, M4, M5, M6, M7, M8, M9 }) => {
ill = room.newIllumination()
ill.set_transform(+M1,+M2,+M3,+M4,+M5,+M6,+M7,+M8,+M9)
ill.stroke("white")
ill.strokewidth(3)
ill.nofill()
xRect(140, 1000, 100)
let Y2 = 320;
let H2 = 45;
xRect(Y2, 900,H2)
xRect(Y2+H2, 600 ,H2)
xRect(Y2+2*H2, 250, H2)
let Y3 = 490;
let H3 = 45;
xRect(Y3, 800 ,H3)
xRect(Y3+H3*1.3, 900 ,H3)
room.draw(ill, `${displayId}`)

    });
  }
  room.subscriptionPostfix();
})





run();
