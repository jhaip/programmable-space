from helper import init, claim, retract, prehook, subscription, batch, MY_ID_STR, listen, check_server_connection, get_my_id_str
from graphics import Illumination
import time

FRAMES = []
FRAME_INDEX = 0
DELAY_S_BETWEEN_FRAMES = 0.25

@subscription(["$ $ camera sees subframe $frameNumber $frame @ $"])
def sub_callback_frames(results):
    global FRAMES
    if results and len(results) > 0:
        FRAMES = list(map(lambda x: x["frame"], results))
    else:
        FRAMES = 0

def check_for_new_frames():
    more_messages_to_receive = True
    while more_messages_to_receive:
        more_messages_to_receive = listen(blocking=False)

init(__file__, skipListening=True)

while True:
    start_time = time.time()
    batch_claims = [{"type": "retract", "fact": [
        ["id", get_my_id_str()],
        ["id", "0"],
        ["postfix", ""]
    ]}]
    if len(FRAMES) > 0:
        FRAME_INDEX += 1
        if FRAME_INDEX >= len(FRAMES):
            FRAME_INDEX = 0
        ill = Illumination()
        ill.image(0, 0, 100*8, 200*8, FRAMES[FRAME_INDEX])
        ill.fontcolor(255, 0, 0)
        ill.text(0, 0, "{}/{}".format(FRAME_INDEX, len(FRAMES)))
        batch_claims.append(ill.to_batch_claim(get_my_id_str(), "0"))
    batch(batch_claims)
    check_for_new_frames()
    sleep_time = max(DELAY_S_BETWEEN_FRAMES - (time.time() - start_time), 0.01)
    time.sleep(sleep_time)
