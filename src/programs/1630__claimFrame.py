from helper import init, subscription, batch, MY_ID_STR, get_my_id_str, rpc_url, override_my_id
from imutils.video import WebcamVideoStream, VideoStream
import numpy as np
import cv2
import imutils
import os
import time
import logging
import base64
import cv2.aruco as aruco
import sys
import http.server
import socketserver
import threading
import socket
from io import BytesIO

lock = threading.RLock()

CAMERA_ID = "1994"
if len(sys.argv) - 1 > 0:
    CAMERA_ID = sys.argv[1]
    if len(sys.argv) - 2 > 0:
        M = int(sys.argv[2])
        MY_ID = str(M)
        MY_ID_STR = MY_ID
        override_my_id(MY_ID)

PORT = 8000
DEBUG = False
cached_image = BytesIO()
last_image_update = time.time()

CAM_WIDTH = 1280
CAM_HEIGHT = 720
capture = WebcamVideoStream(src=0)
capture.stream.set(cv2.CAP_PROP_FRAME_WIDTH, CAM_WIDTH)
capture.stream.set(cv2.CAP_PROP_FRAME_HEIGHT, CAM_HEIGHT)
capture.stream.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc('M', 'J', 'P', 'G'))
# capture = VideoStream(usePiCamera=True, resolution=(1640, 1232))
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
            ["text", "frame"],
            ["text", "at"],
            ["text", "http://{}:{}/src/files/cv-frame.jpg".format(get_host_ip(), PORT)],
        ]},
    ]
    batch(claims)

def create_server():
    global lock, PORT, cached_image
    class MyHttpRequestHandler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
            with lock:
                self.send_response(200)
                self.send_header('Content-type','image/jpeg')
                self.end_headers()
                self.wfile.write(cached_image.read())
    handler_object = MyHttpRequestHandler
    my_server = socketserver.TCPServer(("", PORT), handler_object)
    my_server.serve_forever()

init(__file__, skipListening=True)
init_claim()
threading.Thread(target=create_server).start()
while True:
    frame = capture.read()
    if time.time() - last_image_update > 1.0:
        with lock:
            is_success, buffer = cv2.imencode(".jpg", frame)
            cached_image = BytesIO(buffer)
        last_image_update = time.time()
    if DEBUG:
        cv2.imshow("Original", frame)
        cv2.waitKey(0)
    time.sleep(0.25)
