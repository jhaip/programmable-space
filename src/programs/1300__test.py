import time
import logging
from helper2 import init, claim, retract, prehook, subscription, batch, get_my_id_pre_init, get_my_id_str

N = 10
MY_ID = str(get_my_id_pre_init(__file__))
F = int(get_my_id_pre_init(__file__)) + N
logging.error("testing with N = " + str(N))

@subscription(["$ test client " + str(MY_ID) + " says $x @ $time1", "$ test client " + str(F) + " says $y @ $time2"])
def sub_callback(results):
    currentTimeMs = int(round(time.time() * 1000))
    claims = []
    claims.append({"type": "retract", "fact": [
        ["id", get_my_id_str()],
        ["postfix", ""],
    ]})
    batch(claims)
    # const span = tracer.startSpan('1200-done', { childOf: room.wireCtx() });
    start_time = int(results[0]['time1'])
    finish_time = int(results[0]['time2'])
    print("TEST IS DONE @ %s %s" % (currentTimeMs, results))
    logging.error("elapsed time: %s ms" % (finish_time-start_time))
    # console.log("elapsed time:", parseInt(results[0].time2) - parseInt(results[0].time1), "ms")
    # span.finish();

@prehook
def my_prehook():
    time.sleep(1)
    logging.error("sending #1")
    currentTimeMs = int(round(time.time() * 1000))
    claims = []
    claims.append({"type": "claim", "fact": [
        ["text", get_my_id_str()],
        ["text", "test"],
        ["text", "client"],
        ["integer", MY_ID],
        ["text", "says"],
        ["integer", MY_ID],
        ["text", "@"],
        ["integer", str(currentTimeMs)]
    ]})
    batch(claims)
    print("1300 claim")

init(__file__)

# afterServerConnects(() => {
#     const span = tracer.startSpan('1200-claim', { childOf: room.wireCtx() });
#     span.log({ 'event': 'claim from #1200' });
#     const currentTimeMs = (new Date()).getTime()
#     room.assert(["text", "test"], ["text", "client"], ["integer", `${myId}`], ["text", "says"], ["integer", `${myId}`], ["text", "@"], ["integer", `${currentTimeMs}`]);
#     span.finish();
#     room.flush();
# })


