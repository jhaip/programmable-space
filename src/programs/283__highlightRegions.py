from helper2 import init, claim, retract, prehook, subscription, batch, MY_ID_STR, listen, check_server_connection, get_my_id_str
from graphics import Illumination
import numpy as np
import cv2
import logging

projection_matrixes = {}

def project(projection_matrix, x, y):
    pts = (float(x), float(y))
    if projection_matrix is None:
        return pts
    dst = cv2.perspectiveTransform(
        np.array([np.float32([pts])]), projection_matrix)
    return (int(dst[0][0][0]), int(dst[0][0][1]))


@subscription(["$ $ camera $cameraId calibration for $display is $M1 $M2 $M3 $M4 $M5 $M6 $M7 $M8 $M9"])
def sub_callback_calibration_points(results):
    global projection_matrixes
    if results:
        for result in results:
            projection_matrixes[str(result["cameraId"])] = np.float32([
                [float(result["M1"]), float(result["M2"]), float(result["M3"])],
                [float(result["M4"]), float(result["M5"]), float(result["M6"])],
                [float(result["M7"]), float(result["M8"]), float(result["M9"])]])


def highlight_regions(results, subscription_id, r, g, b):
    global projection_matrixes
    claims = []
    claims.append({"type": "retract", "fact": [
        ["id", get_my_id_str()],
        ["id", subscription_id],
        ["postfix", ""],
    ]})
    highlighted_regions = {}
    for result in results:
        if result["regionId"] in highlighted_regions:
            continue # Region is already highlighted
        camera_homography_matrix = projection_matrixes.get(str(result["cameraId"]), None)
        polygon = [
            project(camera_homography_matrix, result["x1"], result["y1"]),
            project(camera_homography_matrix, result["x2"], result["y2"]),
            project(camera_homography_matrix, result["x3"], result["y3"]),
            project(camera_homography_matrix, result["x4"], result["y4"]),
        ]
        highlighted_regions[result["regionId"]] = True
        ill = Illumination()
        ill.fill(r, g, b, 100)
        ill.nostroke()
        ill.polygon(polygon)
        claims.append(ill.to_batch_claim(get_my_id_str(), subscription_id, result["displayId"]))
    batch(claims)


@subscription(["$ $ laser in region $regionId",
               "$ $ region $regionId at $x1 $y1 $x2 $y2 $x3 $y3 $x4 $y4 on camera $cameraId",
               "$ $ camera $cameraId should calibrate to $ $ $ $ $ $ $ $ on display $displayId"])
def sub_callback_highlight_region(results):
    highlight_regions(results, "1", 255, 128, 0)


@subscription(["$ $ region $regionId is toggled",
               "$ $ region $regionId at $x1 $y1 $x2 $y2 $x3 $y3 $x4 $y4 on camera $cameraId",
               "$ $ camera $cameraId should calibrate to $ $ $ $ $ $ $ $ on display $displayId"])
def sub_callback_toggle_regions(results):
    highlight_regions(results, "2", 0, 128, 255)

init(__file__)