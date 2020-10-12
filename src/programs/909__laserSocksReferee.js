const { room, myId, run } = require('../helper2')(__filename);

room.on(`laser in region $regionId @ $t`,
    `region $regionId has name $regionName`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(({ regionId, t, regionName }) => {
                if (regionName === "p1area") {
                    room.assert(`player 1 scored @ ${t}`)
                } else if (regionName === "p2area") {
                    room.assert(`player 2 scored @ ${t}`)
                }
            });
        }
        room.subscriptionPostfix();
    })

run();
