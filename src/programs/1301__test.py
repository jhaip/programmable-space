import time
import logging
from helper2 import init, claim, retract, prehook, subscription, batch, override_my_id
import sys

# M = 1300
# MY_ID = str(get_my_id_pre_init(__file__))
# P = int(get_my_id_pre_init(__file__))-1

M = int(sys.argv[1])
MY_ID = str(M)
MY_ID_STR = MY_ID
P = M - 1

override_my_id(MY_ID)

@subscription(["$ test client " + str(P) + " says $x @ $time"])
def sub_callback(results):
    currentTimeMs = int(round(time.time() * 1000))
    claims = []
    claims.append({"type": "retract", "fact": [
        ["id", MY_ID_STR],
        ["postfix", ""],
    ]})
    claims.append({"type": "claim", "fact": [
        ["text", MY_ID_STR],
        ["text", "test"],
        ["text", "client"],
        ["integer", MY_ID],
        ["text", "says"],
        ["integer", MY_ID],
        ["text", "@"],
        ["integer", str(currentTimeMs)]
    ]})
    batch(claims)

init(__file__)
