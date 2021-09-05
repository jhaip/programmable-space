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

capture = WebcamVideoStream(src=0)
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
    claims = [
        {"type": "retract", "fact": [["id", get_my_id_str()], ["id", "1"], ["postfix", ""]]}
    ]
    start = time.time()
    frame = capture.read()
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    aruco_dict = aruco.Dictionary_get(aruco.DICT_6X6_1000)
    arucoParameters = aruco.DetectorParameters_create()
    corners, ids, rejectedImgPoints = aruco.detectMarkers(
        gray, aruco_dict, parameters=arucoParameters)
    currentTimeMs = int(round(time.time() * 1000))
    if ids is not None and len(ids) > 0:
        for i, _tag_corners in enumerate(corners):
            tag_corners = _tag_corners[0]
            claims.append({"type": "claim", "fact": [
                ["id", get_my_id_str()],
                ["id", "1"],
                ["text", "camera"],
                ["integer", str(CAMERA_ID)],
                ["text", "sees"],
                ["text", "aruco"],
                ["integer", str(ids[i][0])],
                ["text", "at"],
                ["integer", str(int(tag_corners[0][0]))],
                ["integer", str(int(tag_corners[0][1]))],
                ["integer", str(int(tag_corners[1][0]))],
                ["integer", str(int(tag_corners[1][1]))],
                ["integer", str(int(tag_corners[2][0]))],
                ["integer", str(int(tag_corners[2][1]))],
                ["integer", str(int(tag_corners[3][0]))],
                ["integer", str(int(tag_corners[3][1]))],
                ["text", "@"],
                ["integer", str(currentTimeMs)]
            ]})
    debugFrame = aruco.drawDetectedMarkers(frame, corners)
    with lock:
        is_success, buffer = cv2.imencode(".jpg", debugFrame)
        cached_image = BytesIO(buffer)
    batch(claims)
    logging.error("Time to capture and claim: {}".format(time.time() - start))
    if DEBUG:
        cv2.imshow("Original", debugFrame)
        cv2.waitKey(0)
    time.sleep(0.2)
