from helper2 import init, subscription, batch, MY_ID_STR, check_server_connection, get_my_id_str
from imutils.video import WebcamVideoStream
import numpy as np
import cv2
import imutils
import os
import time
import logging
import math
import base64

CAM_WIDTH = 1920
CAM_HEIGHT = 1080
THRESHOLD = 200
DEBUG = False

capture = WebcamVideoStream(src=0)
capture.stream.set(cv2.CAP_PROP_FRAME_WIDTH, CAM_WIDTH)
capture.stream.set(cv2.CAP_PROP_FRAME_HEIGHT, CAM_HEIGHT)
time.sleep(2)
capture.start()
time.sleep(2)

PERSPECTIVE_CALIBRATION = np.array([
        (360, 30),
        (1560, 30),
        (1700, 880),
        (220, 880)], dtype = "float32")
PERSPECTIVE_IMAGE_WIDTH = 1920
PERSPECTIVE_IMAGE_HEIGHT = 1080
dst = np.array([
        [0, 0],
        [PERSPECTIVE_IMAGE_WIDTH - 1, 0],
        [PERSPECTIVE_IMAGE_WIDTH - 1, PERSPECTIVE_IMAGE_HEIGHT - 1],
        [0, PERSPECTIVE_IMAGE_HEIGHT - 1]], dtype = "float32")
PERSPECTIVE_MATRIX = cv2.getPerspectiveTransform(PERSPECTIVE_CALIBRATION, dst)
MIN_CONTOUR_AREA = 50*50
MAX_N_IMAGES = 12
CONTOUR_PERSPECTIVE_IMAGE_WIDTH = 100
CONTOUR_PERSPECTIVE_IMAGE_HEIGHT = 200

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


def detect():
    image = capture.read()
    warped = cv2.warpPerspective(image, PERSPECTIVE_MATRIX, (PERSPECTIVE_IMAGE_WIDTH, PERSPECTIVE_IMAGE_HEIGHT))
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
        if DEBUG:
            cv2.imshow("Blob {}".format(i), contour_perspective_image)
    if DEBUG:
        cv2.imshow("Original", image)
        cv2.imshow("Warped", warped_grey)
        cv2.imshow("Threshold", threshold_image)
        cv2.drawContours(warped, chosen_contours, -1, (0, 255, 0), 3) 
        cv2.imshow("Threshold", warped)
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

if not DEBUG:
    init(__file__, skipListening=True)

while True:
    sub_images = detect()
    
    if DEBUG:
      cv2.waitKey(0)
      break
    else:
        claim_data(sub_images)
        time.sleep(0.1)
