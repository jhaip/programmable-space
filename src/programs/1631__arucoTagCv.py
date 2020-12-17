from helper import init, subscription, batch, MY_ID_STR, check_server_connection, get_my_id_str, rpc_url
from imutils.video import WebcamVideoStream
import numpy as np
import cv2
import imutils
import os
import time
import logging
import base64
import cv2.aruco as aruco

# CAM_WIDTH = 1920
# CAM_HEIGHT = 1080
DEBUG = False

capture = WebcamVideoStream(src=6)
# capture.stream.set(cv2.CAP_PROP_FRAME_WIDTH, CAM_WIDTH)
# capture.stream.set(cv2.CAP_PROP_FRAME_HEIGHT, CAM_HEIGHT)

# time.sleep(2)
capture.start()
time.sleep(2)

init(__file__, skipListening=True)

while True:
    start = time.time()
    frame = capture.read()
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    aruco_dict = aruco.Dictionary_get(aruco.DICT_6X6_1000)
    arucoParameters = aruco.DetectorParameters_create()
    corners, ids, rejectedImgPoints = aruco.detectMarkers(
        gray, aruco_dict, parameters=arucoParameters)
    debugFrame = aruco.drawDetectedMarkers(frame, corners)
    resized = cv2.resize(debugFrame, (192, 108),
                         interpolation=cv2.INTER_NEAREST)
    retval, buffer = cv2.imencode('.jpg', resized)
    jpg_as_text = base64.b64encode(buffer)
    currentTimeMs = int(round(time.time() * 1000))
    claims = [
        {"type": "retract", "fact": [["id", get_my_id_str()], ["id", "0"], ["postfix", ""]]}
    ]
    claims.append({"type": "claim", "fact": [
        ["id", get_my_id_str()],
        ["id", "0"],
        ["text", "aruco"],
        ["text", "sees"],
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
