from helper2 import init, claim, retract, prehook, subscription, batch, MY_ID_STR, listen, check_server_connection, get_my_id_str
from graphics import Illumination
import numpy as np
import cv2
import logging

# Create a perspective transform from the calendar region
# to a 7x5 pixel image. By projecting the laser point using this calibration
# we find out with date on the calendar the laser point is in.

projection_matrixes = {}
DAYS_IN_WEEK = 7
WEEKS_IN_CALENDAR = 5

def project(projection_matrix, x, y):
    pts = (float(x), float(y))
    if projection_matrix is None:
        return pts
    dst = cv2.perspectiveTransform(
        np.array([np.float32([pts])]), projection_matrix)
    return (int(dst[0][0][0]), int(dst[0][0][1]))


@subscription(["$ $ region $id at $x1 $y1 $x2 $y2 $x3 $y3 $x4 $y4 on camera $cameraId",
               "$ $ region $id has name calendar"])
def sub_callback_calibration(results):
    global projection_matrixes
    if results:
        for result in results:
            logging.error("RECAL PROJECTION MATRIX")
            src = np.float32([
                [result["x1"], result["y1"]],
                [result["x2"], result["y2"]],
                [result["x4"], result["y4"]],
                [result["x3"], result["y3"]] # notice the order is not clock-wise
            ])
            dst = np.float32(
                [[0, 0], [DAYS_IN_WEEK, 0], [0, WEEKS_IN_CALENDAR], [DAYS_IN_WEEK, WEEKS_IN_CALENDAR]])
            projection_matrixes[str(result["cameraId"])] = cv2.getPerspectiveTransform(src, dst)


@subscription(["$ $ laser seen at $x $y @ $t on camera $cameraId"])
def sub_callback_laser_dots(results):
    global projection_matrixes
    claims = []
    claims.append({"type": "retract", "fact": [
        ["id", get_my_id_str()],
        ["id", "1"],
        ["postfix", ""],
    ]})
    for result in results:
        pt = project(projection_matrixes.get(str(result["cameraId"])), result["x"], result["y"])
        logging.info("DOT {} {} {} {}".format(result["x"], result["y"], pt[0], pt[1]))
        if pt[0] >= 0 and pt[1] >= 0 and pt[0] < DAYS_IN_WEEK and pt[1] < WEEKS_IN_CALENDAR:
            grid_x = int(pt[0])
            grid_y = int(pt[1])
            claims.append({"type": "claim", "fact": [
                ["id", get_my_id_str()],
                ["id", "1"],
                ["text", "laser"],
                ["text", "at"],
                ["text", "calendar"],
                ["text", str(grid_x)],
                ["text", str(grid_y)],
                ["text", "@"],
                ["text", str(result["t"])],
            ]})
    batch(claims)

init(__file__)