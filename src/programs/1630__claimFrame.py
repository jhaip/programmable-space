from helper import init, subscription, batch, MY_ID_STR, check_server_connection, get_my_id_str, rpc_url
from imutils.video import WebcamVideoStream
import numpy as np
import cv2
import imutils
import os
import time
import logging
import base64

# CAM_WIDTH = 1920
# CAM_HEIGHT = 1080
DEBUG = False

capture = WebcamVideoStream(src=0)
# capture.stream.set(cv2.CAP_PROP_FRAME_WIDTH, CAM_WIDTH)
# capture.stream.set(cv2.CAP_PROP_FRAME_HEIGHT, CAM_HEIGHT)

# time.sleep(2)
capture.start()
time.sleep(2)

init(__file__, skipListening=True)

while True:
    start = time.time()
    image = capture.read()
    logging.error("Time to capture: {}".format(time.time() - start))
    resized = cv2.resize(image, (768, 432), interpolation=cv2.INTER_NEAREST)
    retval, buffer = cv2.imencode('.jpg', resized)
    jpg_as_text = base64.b64encode(buffer)
    logging.error("Time to capture + b64 encode: {}".format(time.time() - start))
    currentTimeMs = int(round(time.time() * 1000))
    claims = [
        {"type": "retract", "fact": [["id", get_my_id_str()], ["id", "0"], ["postfix", ""]]}
    ]
    claims.append({"type": "claim", "fact": [
        ["id", get_my_id_str()],
        ["id", "0"],
        ["text", "camera"],
        ["text", "sees"],
        ["text", "frame"],
        ["text", str(jpg_as_text, "utf-8")],
        ["text", "@"],
        ["integer", str(currentTimeMs)]
    ]})
    batch(claims)
    logging.error("Time to capture and claim: {}".format(time.time() - start))
    if DEBUG:
        cv2.imshow("Original", image)
        logging.info(jpg_as_text)
    time.sleep(1.0)
