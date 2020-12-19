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

CAMERA_ID = 1994
DEBUG = False
last_screenshot_claimed = time.time()
capture = WebcamVideoStream(src=6)
capture.start()
time.sleep(2)

init(__file__, skipListening=True)

while True:
    claims = [
        {"type": "retract", "fact": [["id", get_my_id_str()], ["id", "0"], ["postfix", ""]]}
    ]
    start = time.time()
    frame = capture.read()
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    aruco_dict = aruco.Dictionary_get(aruco.DICT_6X6_1000)
    arucoParameters = aruco.DetectorParameters_create()
    corners, ids, rejectedImgPoints = aruco.detectMarkers(
        gray, aruco_dict, parameters=arucoParameters)
    for i, tag_corners in enumerate(corners):
        claims.append({"type": "claim", "fact": [
            ["id", get_my_id_str()],
            ["id", "0"],
            ["text", "camera"],
            ["integer", str(CAMERA_ID)],
            ["text", "sees"],
            ["text", "aruco"],
            ["text", str(ids[i])],
            ["text", "at"],
            ["integer", str(tag_corners[0][0])],
            ["integer", str(tag_corners[0][1])],
            ["integer", str(tag_corners[1][0])],
            ["integer", str(tag_corners[1][1])],
            ["integer", str(tag_corners[2][0])],
            ["integer", str(tag_corners[2][1])],
            ["integer", str(tag_corners[3][0])],
            ["integer", str(tag_corners[3][1])],
            ["text", "@"],
            ["integer", str(currentTimeMs)]
        ]})
    if time.time() - last_screenshot_claimed > 1: # seconds
        last_screenshot_claimed = time.time()
        debugFrame = aruco.drawDetectedMarkers(frame, corners)
        resized = cv2.resize(debugFrame, (192, 108),
                            interpolation=cv2.INTER_NEAREST)
        retval, buffer = cv2.imencode('.jpg', resized)
        jpg_as_text = base64.b64encode(buffer)
        currentTimeMs = int(round(time.time() * 1000))
        claims.append({"type": "claim", "fact": [
            ["id", get_my_id_str()],
            ["id", "0"],
            ["text", "camera"],
            ["integer", str(CAMERA_ID)],
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
    time.sleep(0.2)
