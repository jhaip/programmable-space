const { room, myId, run } = require('../helper2')(__filename);

room.on(
    `$photon sees color ( $r, $g, $b )`,
    results => {
        console.log("results:")
        console.log(results)
        room.cleanup();
        if (!results || results.length === 0) {
            room.assert(`wish RGB light strand is color 10 0 0`)
        } else {
            let r = results[0].r;
            let g = results[0].g;
            let b = results[0].b;
            let scale = x => Math.floor(x*0.3);
            room.assert(`wish RGB light strand is color ${scale(r)} ${scale(g)} ${scale(b)}`)
        }
    }
)

run();