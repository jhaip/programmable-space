from helper2 import init, subscription, batch, MY_ID_STR, check_server_connection, get_my_id_str
import helper2
from imutils.video import WebcamVideoStream
import numpy as np
import cv2
import imutils
import os
import time
import logging
import sys

helper2.rpc_url = "192.168.1.34"

CAMERA_ID = "9999"
if len(sys.argv) - 1 > 0:
    CAMERA_ID = sys.argv[1]

CAM_WIDTH = 160
CAM_HEIGHT = 120
THRESHOLD = 20
DEBUG = False
last_data = []

capture = WebcamVideoStream(src=0)
capture.stream.set(cv2.CAP_PROP_FRAME_WIDTH, CAM_WIDTH)
capture.stream.set(cv2.CAP_PROP_FRAME_HEIGHT, CAM_HEIGHT)
time.sleep(2)
capture.start()
time.sleep(2)

def claim_camera_resolution():
    claims = [
        {"type": "retract", "fact": [["id", get_my_id_str()], ["postfix", ""]]},
        {"type": "claim", "fact": [
            ["id", get_my_id_str()],
            ["id", "0"],
            ["text", "camera"],
            ["text", str(CAMERA_ID)],
            ["text", "has"],
            ["text", "resolution"],
            ["integer", str(CAM_WIDTH)],
            ["integer", str(CAM_HEIGHT)],
        ]}
    ]
    batch(claims)

def detect(background):
    image = capture.read()
    image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    diff = cv2.subtract(image, background)
    ret, threshold_image = cv2.threshold(diff, THRESHOLD, 255, cv2.THRESH_BINARY)
    im2, contours, hierarchy = cv2.findContours(threshold_image, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    if DEBUG:
        # cv2.imshow("Original", image)
        # cv2.imshow("Subtract", diff)
        cv2.imshow("Threshold", threshold_image)
    return contours


def claim_data(data):
    global last_data
    if len(last_data) == 0 and len(data) == 0:
        if DEBUG:
            logging.info("empty data again, skipping claim")
        return
    last_data = data
    currentTimeMs = int(round(time.time() * 1000))
    claims = [
        {"type": "retract", "fact": [["id", get_my_id_str()], ["id", "1"], ["postfix", ""]]}
    ]
    for datum in data:
        x = int(sum([d[0][0] for d in datum])/len(datum))
        y = int(sum([d[0][1] for d in datum])/len(datum))
        v = cv2.contourArea(datum)
        # if v < 20:
        #     continue
        if DEBUG:
            logging.info((x, y))
        claims.append({"type": "claim", "fact": [
            ["id", get_my_id_str()],
            ["id", "1"],
            ["text", "laser"],
            ["text", "seen"],
            ["text", "at"],
            ["integer", str(x)],
            ["integer", str(y)],
            # ["integer", str(v)],
            ["text", "@"],
            ["integer", str(currentTimeMs)],
            ["text", "on"],
            ["text", "camera"],
            ["text", CAMERA_ID],
        ]})
    batch(claims)

init(__file__, skipListening=True)
background = capture.read()
background = cv2.cvtColor(background, cv2.COLOR_BGR2GRAY)
background = cv2.GaussianBlur(background, (3, 3), 0)
claim_camera_resolution()
while True:
    dots = detect(background)
    claim_data(dots)
    if DEBUG:
      cv2.waitKey(1)
    time.sleep(0.2)
