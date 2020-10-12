const { room, myId, run } = require('../helper2')(__filename);

room.on(`$photon says the analog value is $value`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(({ photon, value }) => {
                let ill = room.newIllumination()
                const fontSize = 20;
                ill.fontsize(fontSize)
                ill.text(0, 0, `Analog\nValue:\n${value}`)
                room.draw(ill)
                room.assert(`analogValue is ${value}`)
            });
        }
        room.subscriptionPostfix();
    })


run();

