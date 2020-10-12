from helper2 import init, claim, retract, prehook, subscription, batch, MY_ID_STR, listen, check_server_connection, get_my_id_str
from graphics import Illumination
import numpy as np
import cv2
import logging
import json

DISPLAY_WIDTH = 1920
DISPLAY_HEIGHT = 1080
projector_calibrations = {}
projection_matrixes = {}
DOTS_CAMERA_ID = 1
DISPLAY_TARGET_ID = 1993 # 1993

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


@subscription(["$ $ camera {} has projector calibration TL ($x1, $y1) TR ($x2, $y2) BR ($x3, $y3) BL ($x4, $y4) @ $time".format(DOTS_CAMERA_ID)])
def sub_callback_calibration(results):
    global projector_calibrations, projection_matrixes, inverse_projection_matrixes, DISPLAY_WIDTH, DISPLAY_WIDTH
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
            logging.info(projector_calibration)
            logging.error("RECAL PROJECTION MATRIX")
            pts1 = np.float32(projector_calibration)
            pts2 = np.float32(
                [[0, 0], [DISPLAY_WIDTH, 0], [0, DISPLAY_HEIGHT], [DISPLAY_WIDTH, DISPLAY_HEIGHT]])
            projection_matrix = cv2.getPerspectiveTransform(
                pts1, pts2)
            projector_calibrations[DOTS_CAMERA_ID] = projector_calibration
            projection_matrixes[DOTS_CAMERA_ID] = projection_matrix
            logging.error("RECAL PROJECTION MATRIX -- done")


@subscription([
    "$ $ camera {} sees paper $programNumber at TL ($x1, $y1) TR ($x2, $y2) BR ($x3, $y3) BL ($x4, $y4) @ $t2".format(DOTS_CAMERA_ID),
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
                    [[0, 0], [DISPLAY_WIDTH, 0], [0, DISPLAY_HEIGHT], [DISPLAY_WIDTH, DISPLAY_HEIGHT]])
                dst = np.float32([
                    project(DOTS_CAMERA_ID, result["x1"], result["y1"]),
                    project(DOTS_CAMERA_ID, result["x2"], result["y2"]),
                    project(DOTS_CAMERA_ID, result["x4"], result["y4"]),
                    project(DOTS_CAMERA_ID, result["x3"], result["y3"]) # notice the order is not clock-wise
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
                    ["integer", str(DISPLAY_TARGET_ID)],
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
