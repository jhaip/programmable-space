const { room, myId } = require('../helper2')(__filename);

room.cleanup();

var IMG = undefined;
var CURRENT_CORNER = 0;
var CAM_WIDTH = 1920;
var CAM_HEIGHT = 1080;
var CALIBRATION = [[50, 50], [CAM_WIDTH-50, 50], [CAM_WIDTH-50, CAM_HEIGHT-50], [50, CAM_HEIGHT-50]]

function draw() {
    let ill = room.newIllumination();
    ill.push();
    ill.scale(0.5, 0.5);
    if (IMG) {
        ill.image(0, 0, 1920, 1080, IMG) // 160x90px comes from the claim in 1601
    }
    ill.stroke(255, 0, 0);
    ill.strokewidth(2);
    CALIBRATION.forEach((corner, i) => {
        if (i == CURRENT_CORNER) {
            ill.nofill();
        } else {
            ill.fill(255, 0, 0);
        }
        ill.ellipse(corner[0]-10, corner[1]-10, 20, 20);
    })
    ill.pop();
    room.retractMine(`draw graphics %`)
    room.draw(ill);
}

function move(dx, dy) {
    CALIBRATION[CURRENT_CORNER][0] += dx;
    CALIBRATION[CURRENT_CORNER][1] += dy;
    const C = CALIBRATION;
    room.retractAll(`camera 1 has projector calibration TL ($, $) TR ($, $) BR ($, $) BL ($, $) @ $`)
    room.assertForOtherSource("0", `camera 1 has projector calibration TL ( ${C[0][0]}, ${C[0][1]} ) TR ( ${C[1][0]}, ${C[1][1]} ) BR ( ${C[2][0]}, ${C[2][1]} ) BL ( ${C[3][0]}, ${C[3][1]} ) @ ${Math.floor((new Date()).getTime() / 1000)}`);
    draw();
}

room.on(`camera 1 has projector calibration TL ($x1, $y1) TR ($x2, $y2) BR ($x3, $y3) BL ($x4, $y4) @ $`, results => {
    if (results && results.length > 0) {
        results.forEach(({ x1, y1, x2, y2, x3, y3, x4, y4 }) => {
            newCalibration = [[+x1, +y1], [+x2, +y2], [+x3, +y3], [+x4, +y4]];
            if (JSON.stringify(newCalibration) !== JSON.stringify(CALIBRATION)) {
                CALIBRATION = newCalibration;
                draw();
            }
        });
    }
})

room.on(`camera $ screenshot $imageBase64`, results => {
    if (results && results.length > 0) {
        IMG = results[0].imageBase64;
        draw();
    }
})

room.on(`keyboard $ typed key $key @ $t`, results => {
    results.forEach(({ key }) => {
        if (!isNaN(+key) && [1,2,3,4].indexOf(+key) > -1) {
            CURRENT_CORNER = +key - 1;
            draw();
        }
    })
})

room.on(
    `keyboard $ typed special key $specialKey @ $t`,
    results => {
        results.forEach(({ specialKey }) => {
            const m = {
                "up": [0, -1],
                "C-up": [0, -10],
                "down": [0, 1],
                "C-down": [0, 10],
                "left": [-1, 0],
                "C-left": [-10, 0],
                "right": [1, 0],
                "C-right": [10, 0],
            }
            if (specialKey in m) {
                move(m[specialKey][0], m[specialKey][1])
            }
        });
    }
)
