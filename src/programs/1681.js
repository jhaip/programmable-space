const { room, myId, run } = require('../helper2')(__filename);

let myX = -1;
let myY = -1;

room.on(`paper $id has width $width height $height angle $angle at ($x, $y)`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(({ id, width, height, angle, x, y }) => {
                const midAngle = Math.atan2(height * 0.5, width * 0.5)
                const d = Math.sqrt((width * width) + (height * height))
                const paperMiddleX = x + (d * 0.5 * Math.cos(angle + midAngle));
                const paperMiddleY = y + (d * 0.5 * Math.sin(angle + midAngle));
                if (parseInt(id) === parseInt(myId)) {
                    myX = paperMiddleX;
                    myY = paperMiddleY;
                } else if (myX >= 0 && width > 2) {
                    let ill = room.newIllumination()
                    ill.stroke(0, 255, 0)
                    ill.fill(0, 255, 0)
                    ill.strokewidth(3)
                    ill.line(myX, myY, paperMiddleX, paperMiddleY)
                    const ellipseSize = 7;
                    ill.ellipse(paperMiddleX - ellipseSize / 2, paperMiddleY - ellipseSize / 2, ellipseSize, ellipseSize)
                    ill.fontsize(10)
                    ill.text(paperMiddleX, paperMiddleY, `${id}`)
                    ill.nostroke()
                    ill.ellipse(myX - 10, myY - 10, 20, 20)
                    room.draw(ill, "1993")
                }
            });
        }
        room.subscriptionPostfix();
    })


run();
