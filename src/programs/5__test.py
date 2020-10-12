import time
import logging
import math
import datetime
from helper2 import init, claim, retract, prehook, subscription, batch, get_my_id_str


@subscription(["$ $ $X 5 has $Y toes"])
def sub_callback_papers(results):
    logging.error("RESULTS:")
    logging.error(results)

@prehook
def my_prehook():
    claims = []
    claims.append({"type": "claim", "fact": [
        ["id", get_my_id_str()],
        ["id", "0"],
        ["text", "Man"],
        ["integer", "5"],
        ["text", "has"],
        ["integer", "0"],
        ["text", "toes"],
    ]})
    batch(claims)

init(__file__)
