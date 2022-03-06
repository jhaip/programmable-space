from helper import init, claim, retract, prehook, subscription, batch, get_my_id_str, listen
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
from datetime import datetime
import logging
import base64
import traceback
import requests
import numpy as np
import cv2
import math
import time
import sys
import http.server
import socketserver
import threading
import socket
import urllib
import re
from io import BytesIO

THRESHOLD = 200
MIN_CONTOUR_AREA = 50*50
MAX_N_IMAGES = 12
CONTOUR_PERSPECTIVE_IMAGE_WIDTH = 100
CONTOUR_PERSPECTIVE_IMAGE_HEIGHT = 200
PORT = 20802
blob_images = []
debug_image = None
url = None

lock = threading.RLock()

def get_host_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(("8.8.8.8", 80))
    ip = s.getsockname()[0]
    s.close()
    return ip

def order_points(pts):
    #### MODIFIED VERSION OF THE imutils.perspective.order_points() to avoid scipy as a dependency
    # sort the points based on their x-coordinates
    xSorted = pts[np.argsort(pts[:, 0]), :]

    # grab the left-most and right-most points from the sorted
    # x-roodinate points
    leftMost = xSorted[:2, :]
    rightMost = xSorted[2:, :]

    # now, sort the left-most coordinates according to their
    # y-coordinates so we can grab the top-left and bottom-left
    # points, respectively
    leftMost = leftMost[np.argsort(leftMost[:, 1]), :]
    (tl, bl) = leftMost

    # now that we have the top-left coordinate, use it as an
    # anchor to calculate the Euclidean distance between the
    # top-left and right-most points; by the Pythagorean
    # theorem, the point with the largest distance will be
    # our bottom-right point
    # D = dist.cdist(tl[np.newaxis], rightMost, "euclidean")[0]
    D0 = math.sqrt((tl[0]-rightMost[0][0])**2 + (tl[1]-rightMost[0][1])**2)
    D1 = math.sqrt((tl[0]-rightMost[1][0])**2 + (tl[1]-rightMost[1][1])**2)
    if D0 > D1:
        br = rightMost[0]
        tr = rightMost[1]
    else:
        br = rightMost[1]
        tr = rightMost[0]

    # return the coordinates in top-left, top-right,
    # bottom-right, and bottom-left order
    return np.array([tl, tr, br, bl], dtype="float32")


def create_server():
    global lock, PORT, blob_images, debug_image
    class MyHttpRequestHandler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
            parsed_path = urllib.parse.urlsplit(self.path)
            match = re.search('.*-(\d+)\.jpg', parsed_path.path)
            if not match:
                if "debug" in parsed_path and debug_image:
                    with lock:
                        self.send_response(200)
                        self.send_header('Content-type','image/jpeg')
                        self.end_headers()
                        is_success, buffer = cv2.imencode(".jpg", debug_image)
                        self.wfile.write(BytesIO(buffer).read())
                else:
                    self.send_response(404)
            else:
                index = int(match.group(1))
                with lock:
                    self.send_response(200)
                    self.send_header('Content-type','image/jpeg')
                    self.end_headers()
                    if len(blob_images) > 0:
                        is_success, buffer = cv2.imencode(".jpg", blob_images[index])
                        self.wfile.write(BytesIO(buffer).read())
    handler_object = MyHttpRequestHandler
    my_server = socketserver.TCPServer(("", PORT), handler_object)
    my_server.serve_forever()


@subscription(["$ $ camera 1630 frame at $filePath"])
def sub_callback(results):
    global url
    if not results or len(results) is 0:
        url = None
    for result in results:
        url = result["filePath"]
        if not ("http" in result["filePath"]):
            url = "http://192.168.1.34:5000/{}".format(result["filePath"])

def run_cv():
    global url, blob_images, debug_image
    claims = []
    claims.append({"type": "retract", "fact": [["id", get_my_id_str()], ["postfix", ""]]})
    if url is not None:
        try:
            pil_image = Image.open(requests.get(url, stream=True).raw)
            # run CV
            image = np.array(pil_image) 
            # Convert RGB to BGR 
            image = image[:, :, ::-1].copy() 
            image_grey = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            ret, threshold_image = cv2.threshold(image_grey, THRESHOLD, 255, cv2.THRESH_BINARY)
            with lock:
                debug_image = threshold_image
            im2, raw_contours, hierarchy = cv2.findContours(threshold_image, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            contours = []
            print("n raw contours: {}".format(len(raw_contours)))
            for (i, c) in enumerate(raw_contours):
                if hierarchy[0,i,3] == -1 and cv2.contourArea(c) > MIN_CONTOUR_AREA:
                    contours.append(c)
            contours = sorted(contours, key=lambda ctr: cv2.boundingRect(ctr)[0])
            blob_images = []
            chosen_contours = []
            for (i, c) in enumerate(contours[:MAX_N_IMAGES]):
                chosen_contours.append(c)
                box = cv2.minAreaRect(c)
                box = cv2.boxPoints(box)
                box = order_points(box)  # Order the points to (tl, tr, bl, br) to match the perspective transform dst
                contour_perspective = np.array(box, dtype="float32")
                dst = np.array([
                        [0, 0],
                        [CONTOUR_PERSPECTIVE_IMAGE_WIDTH - 1, 0],
                        [CONTOUR_PERSPECTIVE_IMAGE_WIDTH - 1, CONTOUR_PERSPECTIVE_IMAGE_HEIGHT - 1],
                        [0, CONTOUR_PERSPECTIVE_IMAGE_HEIGHT - 1]], dtype = "float32")
                contour_perspective_matrix = cv2.getPerspectiveTransform(contour_perspective, dst)
                contour_perspective_image = cv2.warpPerspective(image, contour_perspective_matrix, (CONTOUR_PERSPECTIVE_IMAGE_WIDTH, CONTOUR_PERSPECTIVE_IMAGE_HEIGHT))
                with lock:
                    blob_images.append(contour_perspective_image)
            # claim
            for i in range(len(blob_images)):
                claims.append({"type": "claim", "fact": [
                    ["id", get_my_id_str()],
                    ["id", "0"],
                    ["text", "camera"],
                    ["text", "1630"],
                    ["text", "subframe"],
                    ["text", "at"],
                    ["text", "http://{}:{}/src/files/cv-frame-{}.jpg".format(get_host_ip(), PORT, i)],
                ]})
        except Exception as e:
            logging.error(traceback.format_exc())
    batch(claims)

threading.Thread(target=create_server).start()
init(__file__, skipListening=True)

while True:
    more_messages_to_receive = True
    while more_messages_to_receive:
        more_messages_to_receive = listen(blocking=False)
    run_cv()
    time.sleep(1)