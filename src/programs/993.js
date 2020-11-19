const { room, myId, run } = require('../helpers/helper')(__filename);

room.on(`paper ${myId} has width $width height $height angle $angle at ($x, $y)`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(({ width, height, angle, x, y }) => {
                let ill = room.newIllumination()
                let degreeAngle = Math.floor(angle * 180.0 / Math.PI);
                const fontSize = 400;
                ill.fontcolor(255, 255, 255)
                ill.fontsize(fontSize)
                ill.text(100, 720/2 - fontSize*0.5, `${degreeAngle}°`)
                room.draw(ill)
                room.assert(`angle is ${degreeAngle}`)
            });
        }
        room.subscriptionPostfix();
    })


run();
