from helper import init, subscription, batch, prehook, MY_ID_STR, get_my_id_str, rpc_url, override_my_id
import cv2
import os
import time
import cv2.aruco as aruco
import sys
import http.server
import socketserver
import threading
import socket
from io import BytesIO

lock = threading.RLock()

CAMERA_ID = "1632"
if len(sys.argv) - 1 > 0:
    CAMERA_ID = sys.argv[1]

BOOT_FILENAME = "aruco-boot-2021-12-10.jpg"

PORT = 11632
cached_image = BytesIO()
last_image_update = time.time()

def get_host_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(("8.8.8.8", 80))
    ip = s.getsockname()[0]
    s.close()
    return ip

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

@prehook
def prehook_init():
    global lock, cached_image
    claims = [
        {"type": "retract", "fact": [["id", get_my_id_str()], ["postfix", ""]]},
        {"type": "claim", "fact": [
            ["id", get_my_id_str()],
            ["id", "0"],
            ["text", "camera"],
            ["integer", str(CAMERA_ID)],
            ["text", "frame"],
            ["text", "at"],
            ["text", "http://{}:{}/src/files/{}".format(get_host_ip(), PORT, BOOT_FILENAME)],
        ]},
    ]
    frame = cv2.imread(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'files/{}'.format(BOOT_FILENAME)))
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

threading.Thread(target=create_server).start()
init(__file__)