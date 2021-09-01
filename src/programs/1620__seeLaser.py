from helper import init, subscription, batch, MY_ID_STR, check_server_connection, get_my_id_str, listen
from imutils.video import WebcamVideoStream
import numpy as np
import cv2
import imutils
import os
import time
import logging
import sys
import http.server
import socketserver
import threading
import socket
from io import BytesIO

lock = threading.RLock()

CAMERA_ID = "9999"
if len(sys.argv) - 1 > 0:
    CAMERA_ID = sys.argv[1]

CAM_WIDTH = 960
CAM_HEIGHT = 540
THRESHOLD = 40
PORT = 8000
DEBUG = False
cached_image = BytesIO()
last_data = []

capture = WebcamVideoStream(src=0)
capture.stream.set(cv2.CAP_PROP_FRAME_WIDTH, CAM_WIDTH)
capture.stream.set(cv2.CAP_PROP_FRAME_HEIGHT, CAM_HEIGHT)
time.sleep(2)
capture.start()
time.sleep(2)

def get_host_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(("8.8.8.8", 80))
    ip = s.getsockname()[0]
    s.close()
    return ip

def init_claim():
    claims = [
        {"type": "retract", "fact": [["id", get_my_id_str()], ["postfix", ""]]},
        {"type": "claim", "fact": [
            ["id", get_my_id_str()],
            ["id", "0"],
            ["text", "camera"],
            ["integer", str(CAMERA_ID)],
            ["text", "has"],
            ["text", "resolution"],
            ["integer", str(CAM_WIDTH)],
            ["integer", str(CAM_HEIGHT)],
        ]},
        {"type": "claim", "fact": [
            ["id", get_my_id_str()],
            ["id", "0"],
            ["text", "camera"],
            ["integer", str(CAMERA_ID)],
            ["text", "cv"],
            ["text", "threshold"],
            ["text", "is"],
            ["integer", str(THRESHOLD)],
        ]},
        {"type": "claim", "fact": [
            ["id", get_my_id_str()],
            ["id", "0"],
            ["text", "camera"],
            ["integer", str(CAMERA_ID)],
            ["text", "frame"],
            ["text", "at"],
            ["text", "http://{}:{}/src/files/cv-frame.jpg".format(get_host_ip(), PORT)],
        ]},
    ]
    batch(claims)

def detect(background):
    global lock, cached_image
    image = capture.read()
    image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    diff = cv2.subtract(image, background)
    ret, threshold_image = cv2.threshold(diff, THRESHOLD, 255, cv2.THRESH_BINARY)
    im2, contours, hierarchy = cv2.findContours(threshold_image, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    if DEBUG:
        cv2.imshow("Original", image)
        cv2.imshow("Subtract", diff)
        cv2.imshow("Threshold", threshold_image)
    with lock:
        is_success, buffer = cv2.imencode(".jpg", threshold_image)
        cached_image = BytesIO(buffer)
    return contours


def claim_data(data):
    global last_data, CAMERA_ID
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
            ["text", "@"],
            ["integer", str(currentTimeMs)],
            ["text", "on"],
            ["text", "camera"],
            ["integer", CAMERA_ID],
        ]})
    batch(claims)

@subscription(["$ $ camera {} cv threshold is $threshold".format(CAMERA_ID)])
def sub_threshold_callback(results):
    global THRESHOLD
    for result in results:
        THRESHOLD = int(result["threshold"])

def create_server():
    global lock, PORT, cached_image
    class MyHttpRequestHandler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
            with lock:
                # if self.path == '/':
                #     self.path = 'index.html'
                # return http.server.SimpleHTTPRequestHandler.do_GET(self)
                self.send_response(200)
                self.send_header('Content-type','image/jpeg')
                self.end_headers()
                self.wfile.write(cached_image.read())
    handler_object = MyHttpRequestHandler
    my_server = socketserver.TCPServer(("", PORT), handler_object)
    my_server.serve_forever()

init(__file__, skipListening=True)
background = capture.read()
background = cv2.cvtColor(background, cv2.COLOR_BGR2GRAY)
background = cv2.GaussianBlur(background, (3, 3), 0)
init_claim()
threading.Thread(target=create_server).start()
while True:
    dots = detect(background)
    claim_data(dots)
    if DEBUG:
      cv2.waitKey(1)
    listen(blocking=False)
    time.sleep(0.1)
