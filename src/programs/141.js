const { room, myId, run } = require('../helper2')(__filename);

const WISKER_LENGTH = 150;

room.onRaw(`$ $ paper $id has width $width height $height angle $angle at ($x, $y)`,
           `$ $ paper $id has id $fullId`,
           `subscription $fullId $ $ $ $ paper $ is pointing at paper $`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(({ id, width, height, angle, x, y }) => {
                const endAngle = Math.atan2(- WISKER_LENGTH, width * 0.5)
                const d = Math.sqrt((width * width * 0.5 * 0.5) + (WISKER_LENGTH * WISKER_LENGTH))
                const wiskerEndX = x + (d * Math.cos(angle + endAngle));
                const wiskerEndY = y + (d * Math.sin(angle + endAngle));
                const wiskerStartX = x + (width * 0.5 * Math.cos(angle));
                const wiskerStartY = y + (width * 0.5 * Math.sin(angle));
                let ill = room.newIllumination()
                ill.stroke(0, 128, 255)
                ill.line(wiskerStartX, wiskerStartY, wiskerEndX, wiskerEndY)
                ill.ellipse(wiskerStartX-2, wiskerStartY-2, 5, 5)
                room.draw(ill, "global")
            });
        }
        room.subscriptionPostfix();
    })


run();

