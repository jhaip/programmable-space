const { room, myId, run, MY_ID_STR, tracer, afterServerConnects } = require('../helper2')(__filename);

const N = 10;
const F = parseInt(myId) + N;
console.log("testing with N =", N);

room.on(
    `test client ${myId} says $x @ $time1`,
    `test client ${F} says $y @ $time2`,
    results => {
        // console.error(results);
        room.subscriptionPrefix(1);
        if (!!results) {
            // const span = tracer.startSpan('1200-done', { childOf: room.wireCtx() });
            const currentTimeMs = (new Date()).getTime()
            console.error(`TEST IS DONE @ ${currentTimeMs}`)
            console.log("elapsed time:", parseInt(results[0].time2) - parseInt(results[0].time1), "ms")
            // span.finish();
        }
        room.subscriptionPostfix();
    }
)

run()

afterServerConnects(() => {
    setTimeout(() => {
        // console.log("wire context:")
        // console.log(room.wireCtx());
        // const span = tracer.startSpan('1200-claim', { childOf: room.wireCtx() });
        // span.log({ 'event': 'claim from #1200' });
        const currentTimeMs = (new Date()).getTime()
        // room.assert(`testt client ${myId} says ${myId} @ ${currentTimeMs}`);
        room.assert(["text", "test"], ["text", "client"], ["integer", `${myId}`], ["text", "says"], ["integer", `${myId}`], ["text", "@"], ["integer", `${currentTimeMs}`]);
        // span.finish();
        room.flush();
    }, 10000);
})


