from helper import init, claim, retract, prehook, subscription, batch, MY_ID_STR, listen, check_server_connection, get_my_id_str
from graphics import Illumination
import numpy as np
import cv2
import logging
import json

PAPER_DISPLAY_WIDTH = 1920
PAPER_DISPLAY_HEIGHT = 1080
projector_calibrations = {}
projection_matrixes = {}

def project(calibration_id, x, y):
    global projection_matrixes
    x = float(x)
    y = float(y)
    if calibration_id not in projection_matrixes:
        logging.error("MISSING PROJECTION MATRIX FOR CALIBRATION {}".format(calibration_id))
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
                [result["x3"], result["y3"]] # notice the order is not clock-wise
            ]
            camera_id = result["cam"]
            if camera_id in projector_calibrations and projector_calibrations[camera_id] == projector_calibration:
                logging.error("skipping camera {} calibration because it hasn't changed".format(camera_id))
                continue
            logging.info(projector_calibration)
            logging.error("RECAL PROJECTION MATRIX")
            pts1 = np.float32(projector_calibration)
            display_calibration = [
                [result["dx1"], result["dy1"]],
                [result["dx2"], result["dy2"]],
                [result["dx4"], result["dy4"]],
                [result["dx3"], result["dy3"]] # notice the order is not clock-wise
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
    "$ $ camera $cam sees paper $programNumber at TL ($x1, $y1) TR ($x2, $y2) BR ($x3, $y3) BL ($x4, $y4) @ $t2",
    "$ $ camera $cam should calibrate to $ $ $ $ $ $ $ $ on display $displayid",
    "$ $ draw graphics $graphics on $programNumber"])
def sub_callback_graphics(results):
    claims = []
    claims.append({"type": "retract", "fact": [
        ["id", get_my_id_str()],
        ["id", "1"],
        ["postfix", ""],
    ]})
    if results:
        for result in results:
            graphics_json = json.loads(result["graphics"])
            if len(graphics_json) > 0:
                src = np.float32(
                    [[0, 0], [PAPER_DISPLAY_WIDTH, 0], [0, PAPER_DISPLAY_HEIGHT], [PAPER_DISPLAY_WIDTH, PAPER_DISPLAY_HEIGHT]])
                camera_id = result["cam"]
                dst = np.float32([
                    project(camera_id, result["x1"], result["y1"]),
                    project(camera_id, result["x2"], result["y2"]),
                    project(camera_id, result["x4"], result["y4"]),
                    project(camera_id, result["x3"], result["y3"]) # notice the order is not clock-wise
                ])
                paper_proj_matrix = cv2.getPerspectiveTransform(
                    src, dst)
                graphics_json.insert(0, {
                    "type": "transform",
                    "options": [
                        # 1, 0, 0,
                        # 0, 1, 0,
                        # 0, 0, 1,
                        paper_proj_matrix[0][0], paper_proj_matrix[0][1], paper_proj_matrix[0][2],
                        paper_proj_matrix[1][0], paper_proj_matrix[1][1], paper_proj_matrix[1][2],
                        paper_proj_matrix[2][0], paper_proj_matrix[2][1], paper_proj_matrix[2][2],
                    ]
                })
                claims.append({"type": "claim", "fact": [
                    ["id", get_my_id_str()],
                    ["id", "1"],
                    ["text", "draw"],
                    ["text", "graphics"],
                    ["text", json.dumps(graphics_json)],
                    ["text", "on"],
                    ["integer", str(result["displayid"])],
                ]})
    batch(claims)

@subscription([
    "$ $ default display for $programNumber is $displayId",
    "$ $ draw graphics $graphics on $programNumber"])
def sub_callback_graphics2(results):
    claims = []
    claims.append({"type": "retract", "fact": [
        ["id", get_my_id_str()],
        ["id", "2"],
        ["postfix", ""],
    ]})
    if results:
        for result in results:
            claims.append({"type": "claim", "fact": [
                ["id", get_my_id_str()],
                ["id", "2"],
                ["text", "draw"],
                ["text", "graphics"],
                ["text", str(result["graphics"])],
                ["text", "on"],
                ["integer", str(result["displayId"])],
            ]})
    batch(claims)

init(__file__)
