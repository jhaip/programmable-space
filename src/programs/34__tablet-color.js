const { room, myId, run } = require('../helper2')(__filename);

room.on(
    `$photon sees color ( $r, $g, $b )`,
    results => {
        console.log("results:")
        console.log(results)
        room.cleanup();
        if (!results || results.length === 0) {
            room.assert(`wish tablet had background color ( 0 , 0 , 0 )`)
        } else {
            let r = results[0].r;
            let g = results[0].g;
            let b = results[0].b;
            room.assert(`wish tablet had background color ( ${r} , ${g} , ${b} )`)
        }
    }
)

run();