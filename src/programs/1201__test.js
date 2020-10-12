const { room, myId, run, MY_ID_STR } = require('../helper2')(__filename);

const M = 1200;
const P = parseInt(myId)-1;

room.on(
    `test client ${M} says $x @ $time`,
    results => {
        // console.error(results);
        room.subscriptionPrefix(1);
        if (!!results) {
            const currentTimeMs = (new Date()).getTime()
            // room.assert(`test client ${myId} says ${myId} @ ${currentTimeMs}`);
    room.assert(["text", "test"], ["text", "client"], ["integer", `${myId}`], ["text", "says"], ["integer", `${myId}`], ["text", "@"], ["integer", `${currentTimeMs}`]);
        }
        room.subscriptionPostfix();
    }
)

run()
