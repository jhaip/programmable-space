const { room, myId, run } = require('../helper2')(__filename);

let lastValue = 0;
let maxValue = 100;

room.on(`time is $time`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(({ time }) => {
                let value = lastValue + 1;
                if (value > maxValue) {
                    value = 0;
                }
                let ill = room.newIllumination()
                const fontSize = 25;
                ill.fontsize(fontSize)
                ill.text(0, 0, `${value}`)
                room.draw(ill)
                room.assert(`value is ${value}`)
                lastValue = value;
            });
        }
        room.subscriptionPostfix();
    })


run();
