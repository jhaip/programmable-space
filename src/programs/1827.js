const { room, myId, run } = require('../helpers/helper')(__filename);

var pressCount = 0;

room.on(`button is pressed`,
    results => {
        room.subscriptionPrefix(1);
        let ill = room.newIllumination()
        ill.fontcolor(200, 200, 200);
        const fontSize = 50;
        ill.fontsize(fontSize);
        if (!!results) {
            if (results.length === 0) {
                ill.text(0, 0, `Button is not pressed...`)
            } else {
                pressCount += 1;
                results.forEach(() => {
                    ill.text(0, 0, `Button has been pressed ${pressCount} times!`)
                });
            }
        }
        room.draw(ill);
        room.subscriptionPostfix();
    })

room.on(`light is $v`,
    results => {
        room.subscriptionPrefix(2);
        let ill = room.newIllumination()
        ill.fill(200, 200, 0);
        if (!!results) {
            results.forEach(({v}) => {
                ill.rect(0, 100, (v-2)*100, 200)
            });
        }
        room.draw(ill);
        room.subscriptionPostfix();
    })


run();

