import logging
from helper import init, claim, retract, prehook, subscription, batch, get_my_id_str
from graphics import Illumination
import numpy as np
import cv2
import cv2.aruco as aruco
import base64
import time

@subscription(["$ $ camera sees frame $frame @ $t"])
def sub_callback(results):
    if not results:
        return
    start = time.time()
    result = results[0]
    frameb64 = result["frame"]
    frame_bytes = base64.b64decode(frameb64)
    npimg = np.fromstring(frame_bytes, dtype=np.uint8)
    frame = cv2.imdecode(npimg, 1)
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    aruco_dict = aruco.Dictionary_get(aruco.DICT_6X6_1000)
    arucoParameters = aruco.DetectorParameters_create()
    corners, ids, rejectedImgPoints = aruco.detectMarkers(
        gray, aruco_dict, parameters=arucoParameters)
    frame = aruco.drawDetectedMarkers(frame, corners)
    retval, buffer = cv2.imencode('.png', frame)
    png_as_text = base64.b64encode(buffer).decode('utf-8')
    batch_claims = []
    batch_claims.append({"type": "retract", "fact": [
        ["id", get_my_id_str()],
        ["postfix", ""],
    ]})
    ill = Illumination()
    ill.image(0, 0, 768, 432, png_as_text)
    ill.fontsize(100)
    ill.fontcolor(255, 0, 0)
    ill.text(0, 0, "{}".format(time.time()))
    batch_claims.append(ill.to_batch_claim(get_my_id_str(), "0"))
    batch(batch_claims)
    logging.error("Time to fully proccess and claim: {}".format(time.time() - start))
    logging.error("Lag from message send: {} --- {}".format(time.time() - result["t"]/1000, time.time()))

init(__file__)