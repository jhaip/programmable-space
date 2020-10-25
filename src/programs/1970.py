from helper import init, subscription, batch, MY_ID_STR, check_server_connection, get_my_id_str
from imutils.video import WebcamVideoStream
import numpy as np
import cv2
import imutils
import os
import time
import logging
import math
import base64

THRESHOLD = 200
MIN_CONTOUR_AREA = 20*20
MAX_N_IMAGES = 12
CONTOUR_PERSPECTIVE_IMAGE_WIDTH = 50
CONTOUR_PERSPECTIVE_IMAGE_HEIGHT = 100

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


def b64img_to_cv2_img(encoded_data):
    nparr = np.fromstring(base64.b64decode(encoded_data), np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img


def detect(frame_data):
    new_img_str = base64.b64decode(b64_img_str)
    image = # TODO
    warped = cv2.flip( warped, -1 )  # flip both axes
    warped_grey = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    ret, threshold_image = cv2.threshold(warped_grey, THRESHOLD, 255, cv2.THRESH_BINARY)
    im2, raw_contours, hierarchy = cv2.findContours(threshold_image, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    contours = []
    for (i, c) in enumerate(raw_contours):
        if hierarchy[0,i,3] == -1 and cv2.contourArea(c) > MIN_CONTOUR_AREA:
            contours.append(c)
    contours = sorted(contours, key=lambda ctr: cv2.boundingRect(ctr)[0])
    blob_images = []
    chosen_contours = []
    for (i, c) in enumerate(contours[:MAX_N_IMAGES]):
        chosen_contours.append(c)
        box = cv2.minAreaRect(c)
        box = cv2.cv.BoxPoints(box) if imutils.is_cv2() else cv2.boxPoints(box)
        box = order_points(box)  # Order the points to (tl, tr, bl, br) to match the perspective transform dst
        contour_perspective = np.array(box, dtype="float32")
        dst = np.array([
                [0, 0],
                [CONTOUR_PERSPECTIVE_IMAGE_WIDTH - 1, 0],
                [CONTOUR_PERSPECTIVE_IMAGE_WIDTH - 1, CONTOUR_PERSPECTIVE_IMAGE_HEIGHT - 1],
                [0, CONTOUR_PERSPECTIVE_IMAGE_HEIGHT - 1]], dtype = "float32")
        contour_perspective_matrix = cv2.getPerspectiveTransform(contour_perspective, dst)
        contour_perspective_image = cv2.warpPerspective(warped, contour_perspective_matrix, (CONTOUR_PERSPECTIVE_IMAGE_WIDTH, CONTOUR_PERSPECTIVE_IMAGE_HEIGHT))
        blob_images.append(contour_perspective_image)
    return blob_images


def claim_data(data):
    currentTimeMs = int(round(time.time() * 1000))
    claims = [
        {"type": "retract", "fact": [["id", get_my_id_str()], ["id", "0"], ["postfix", ""]]}
    ]
    for (i, datum) in enumerate(data):
        retval, buffer = cv2.imencode('.jpg', datum)
        jpg_as_text = base64.b64encode(buffer)
        claims.append({"type": "claim", "fact": [
            ["id", get_my_id_str()],
            ["id", "0"],
            ["text", "camera"],
            ["text", "sees"],
            ["text", "subframe"],
            ["integer", str(i)],
            ["text", str(jpg_as_text, "utf-8")],
            ["text", "@"],
            ["integer", str(currentTimeMs)]
        ]})
    batch(claims)

@subscription(["$ $ camera sees frame $frame @ $"])
def sub_callback_frame(results):
    if results and len(results) > 0:
        b64_frame_data = results[0]["frame"]
        frame_img = b64img_to_cv2_img(b64_frame_data)
        if frame_img not None:
            subframe_data = detect(frame_img)
            claim_data(subframe_data)
        else:
            logging.error("ERROR DECODING IMAGE")

init(__file__)
