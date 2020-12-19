from helper import init, claim, retract, prehook, subscription, batch, MY_ID_STR, listen, check_server_connection, get_my_id_str
from graphics import Illumination
import numpy as np
import cv2
import logging
import json
import math

projector_calibrations = {}
projection_matrixes = {}


def project(calibration_id, x, y):
    global projection_matrixes
    x = float(x)
    y = float(y)
    if calibration_id not in projection_matrixes:
        logging.error(
            "MISSING PROJECTION MATRIX FOR CALIBRATION {}".format(calibration_id))
        return (x, y)
    projection_matrix = projection_matrixes[calibration_id]
    pts = [(x, y)]
    dst = cv2.perspectiveTransform(
        np.array([np.float32(pts)]), projection_matrix)
    return (int(dst[0][0][0]), int(dst[0][0][1]))


@subscription([
    "$ $ camera $cam has projector calibration TL ($x1, $y1) TR ($x2, $y2) BR ($x3, $y3) BL ($x4, $y4) @ $",
    "$ $ camera $cam should calibrate to $dx1 $dy1 $dx2 $dy2 $dx3 $dy3 $dx4 $dy4 on display $"])
def sub_callback_calibration(results):
    global projector_calibrations, projection_matrixes
    logging.info("sub_callback_calibration")
    logging.info(results)
    if results:
        for result in results:
            projector_calibration = [
                [result["x1"], result["y1"]],
                [result["x2"], result["y2"]],
                [result["x4"], result["y4"]],
                # notice the order is not clock-wise
                [result["x3"], result["y3"]]
            ]
            camera_id = result["cam"]
            if camera_id in projector_calibrations and projector_calibrations[camera_id] == projector_calibration:
                logging.error(
                    "skipping camera {} calibration because it hasn't changed".format(camera_id))
                continue
            logging.info(projector_calibration)
            logging.error("RECAL PROJECTION MATRIX")
            pts1 = np.float32(projector_calibration)
            display_calibration = [
                [result["dx1"], result["dy1"]],
                [result["dx2"], result["dy2"]],
                [result["dx4"], result["dy4"]],
                # notice the order is not clock-wise
                [result["dx3"], result["dy3"]]
            ]
            pts2 = np.float32(display_calibration)
            projection_matrix = cv2.getPerspectiveTransform(
                pts1, pts2)
            projector_calibrations[camera_id] = projector_calibration
            projection_matrixes[camera_id] = projection_matrix
            logging.error("RECAL PROJECTION MATRIX -- done")


# maybe we should cache where papers are what their graphics are to avoid recalculating everything
# when on programs position or graphics change
@subscription([
    "$ $ camera $cam sees aruco $tagId at $x1 $y1 $x2 $y2 $x3 $y3 $x4 $y4 @ $t2",
    "$ $ camera $cam should calibrate to $ $ $ $ $ $ $ $ on display $displayid"])
def sub_callback_graphics(results):
    claims = []
    claims.append({"type": "retract", "fact": [
        ["id", get_my_id_str()],
        ["id", "1"],
        ["postfix", ""],
    ]})
    if results:
        for result in results:
            camera_id = result["cam"]
            projection_matrix = [
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1],
            ]
            if camera_id in projection_matrixes:
                projection_matrix = projection_matrixes[camera_id]
            dst = np.float32([
                project(camera_id, result["x1"], result["y1"]),
                project(camera_id, result["x2"], result["y2"]),
                project(camera_id, result["x4"], result["y4"]),
                # notice the order is not clock-wise
                project(camera_id, result["x3"], result["y3"])
            ])
            # diameter = np.sqrt((dst[0][0]-dst[3][0])**2 +
            #                 (dst[0][1]-dst[3][1])**2)
            # cx = int((dst[0][0] + dst[1][0] + dst[2][0] + dst[3][0]) / 4)
            # cy = int((dst[0][1] + dst[1][1] + dst[2][1] + dst[3][1]) / 4)
            diameter = np.sqrt((result["x1"]-result["x3"])**2 +
                               (result["y1"]-result["y3"])**2) * 2
            cx = int((result["x1"] + result["x2"] + result["x3"] + result["x4"]) / 4)
            cy = int((result["y1"] + result["y2"] + result["y3"] + result["y4"]) / 4)
            angle = math.atan2(int(result["y1"] - result["y2"]), int(result["x1"] - result["x2"]))
            ill = Illumination()
            ill.set_transform(
                projection_matrix[0][0], projection_matrix[0][1], projection_matrix[0][2],
                projection_matrix[1][0], projection_matrix[1][1], projection_matrix[1][2],
                projection_matrix[2][0], projection_matrix[2][1], projection_matrix[2][2],
            )
            ill.nofill()
            ill.stroke(255, 0, 0)
            ill.strokewidth(5)
            ill.ellipse(int(cx-diameter/2), int(cy-diameter/2), diameter, int(diameter))
            ill.stroke(0, 255, 0)
            ill.line(
                cx + diameter * 0.5 * math.cos(angle),
                cy + diameter * 0.5 * math.sin(angle),
                cx + diameter * 0.5 * math.cos(angle) * 1.2,
                cy + diameter * 0.5 * math.sin(angle) * 1.2,
            )
            claims.append(ill.to_batch_claim(get_my_id_str(), "1", target=result["displayid"]))
            claims.append({"type": "claim", "fact": [
                ["id", get_my_id_str()],
                ["id", "1"],
                ["text", "aruco"],
                ["integer", str(result["tagId"])],
                ["text", "has"],
                ["text", "value"],
                ["float", str(angle)],
            ]})
    batch(claims)


init(__file__)
