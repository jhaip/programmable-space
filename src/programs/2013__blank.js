const { room, myId, run } = require('../helper2')(__filename);

room.on(`$ says the humidity is $H and temp is $T`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(({ H, T }) => {
                let ill = room.newIllumination()
                ill.text(25, 50, "humidity " + H)
                ill.text(25, 100, "temp " + T)
                room.draw(ill)

            });
        }
        room.subscriptionPostfix();
    })


run();
