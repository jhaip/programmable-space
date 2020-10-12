const { room, myId, run } = require('../helper2')(__filename);

const LASER_CAMERA_ID = 2;

room.on(`region $regionId at $x1 $y1 $x2 $y2 $x3 $y3 $x4 $y4`,
    `region $regionId has name lasercal`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(({ regionId, x1, y1, x2, y2, x3, y3, x4, y4 }) => {
                room.retractAll(`camera ${LASER_CAMERA_ID} has projector calibration %`);
                let currentTime = (new Date()).getTime() / 1000;
                room.assert(`camera ${LASER_CAMERA_ID} has projector calibration TL ( ${x1} , ${y1} ) TR ( ${x2} , ${y2} ) BR ( ${x3} , ${y3} ) BL ( ${x4} , ${y4} ) @ ${currentTime}`);
            });
        }
        room.subscriptionPostfix();
    })


run();
