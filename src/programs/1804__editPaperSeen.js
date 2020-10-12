const { room, myId, run } = require('../helper2')(__filename);

room.assert(`camera 99 sees paper 1013 at TL( 0 , 0 ) TR ( 1920 , 0 ) BR ( 1920 , 1080 ) BL ( 0 , 1080 ) @ 1`)
room.assert(`paper 1013 has width 1920 height 1080 angle 0 at ( 0 , 0 )`)

room.onRaw(`#1800 $ camera $ sees paper $id at TL ($x1, $y1) TR ($x2, $y2) BR ($x3, $y3) BL ($x4, $y4) @ $time`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(({ id }) => {
                room.assert(`camera 99 sees paper 1013 at TL( 0 , 0 ) TR ( 1920 , 0 ) BR ( 1920 , 1080 ) BL ( 0 , 1080 ) @ 1`)
                room.assert(`paper 1013 has width 1920 height 1080 angle 0 at ( 0 , 0 )`)
                room.assert(`paper 1013 is pointing at paper ${id}`)
            });
        }
        room.subscriptionPostfix();
    })


run();
