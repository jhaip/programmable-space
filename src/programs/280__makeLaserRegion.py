from helper2 import init, claim, retract, prehook, subscription, batch, MY_ID_STR, listen, check_server_connection, get_my_id_str
from graphics import Illumination
import numpy as np
import cv2
import uuid
import logging

MODE = "IDLE"
lastLastPosition = None
regionPoints = [None, None, None, None]
region_id = None
ignore_key_press = True
is_toggleable = True
region_name = ""
CAM_WIDTH = 1920
CAM_HEIGHT = 1080
projector_calibrations = {}
projection_matrixes = {}
LASER_CAMERA_ID = 2
# CAMERA 2 calibration:
# camera 2 has projector calibration TL(512, 282) TR(1712, 229) BR(1788, 961) BL(483, 941) @2
DRAW_TARGET = "global"

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


@subscription(["$ $ camera $cameraId has projector calibration TL ($x1, $y1) TR ($x2, $y2) BR ($x3, $y3) BL ($x4, $y4) @ $time"])
def sub_callback_calibration(results):
    global projector_calibrations, projection_matrixes, CAM_WIDTH, CAM_HEIGHT
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
                [[0, 0], [CAM_WIDTH, 0], [0, CAM_HEIGHT], [CAM_WIDTH, CAM_HEIGHT]])
            projection_matrix = cv2.getPerspectiveTransform(
                pts1, pts2)
            projector_calibrations[int(result["cameraId"])] = projector_calibration
            projection_matrixes[int(result["cameraId"])] = projection_matrix
            logging.error("RECAL PROJECTION MATRIX -- done")


def render_mode():
    global MODE, is_toggleable, region_name
    RENDER_MODE_SUBSCRIPTION_ID = "99"
    claims = []
    claims.append({
        "type": "retract", "fact": [
            ["id", get_my_id_str()],
            ["id", RENDER_MODE_SUBSCRIPTION_ID],
            ["postfix", ""],
        ]
    })
    ill = Illumination()
    if MODE == "IDLE":
        ill.text(0, 0, "idle\npress down\nto define\na region")
    elif MODE in ["0", "1", "2", "3"]:
        ill.text(0, 0, "setting\ncorner\n{}/4".format(int(MODE) + 1))
    elif MODE == "is_toggleable":
        is_toggleable_text = "no"
        if is_toggleable:
            is_toggleable_text = "yes"
        ill.text(0, 0, "Should region\nbe a toggle?\ny/n -> {}\npress enter\nto accept".format(is_toggleable_text))
    elif MODE == "naming":
        region_name_text = "..."
        if region_name:
            region_name_text = region_name
        ill.text(0, 0, "region name:\n{}\npress enter\nto accept".format(region_name_text))
    claims.append(ill.to_batch_claim(get_my_id_str(), RENDER_MODE_SUBSCRIPTION_ID))
    return claims


@subscription(["#0650 $ keyboard $ typed key $key @ $t"])
def sub_callback_normal_key(results):
    global MODE, is_toggleable, region_name, region_id
    if results:
        key = str(results[0]["key"]).lower()
        if MODE == "is_toggleable":
            region_name = ""
            if key == "n" or key == "y":
                is_toggleable = key == "y"
                batch(render_mode())
        elif MODE == "naming":
            if key.isalpha() or key.isdigit() or key == " ":
                region_name += key
                batch(render_mode())


@subscription(["#0650 $ keyboard $ typed special key $key @ $t"])
def sub_callback_keyboard(results):
    global MODE, lastLastPosition, regionPoints, ignore_key_press, region_name, region_id, is_toggleable
    if ignore_key_press:
        ignore_key_press = False
        return
    if not results:
        return
    claims = []
    key = results[0]["key"]
    if key == "down":
        if MODE == "IDLE":
            MODE = "0"
        elif MODE == "0" and lastLastPosition != None:
            MODE = "1"
            regionPoints[0] = lastLastPosition
        elif MODE == "1" and lastLastPosition != None:
            MODE = "2"
            regionPoints[1] = lastLastPosition
        elif MODE == "2" and lastLastPosition != None:
            MODE = "3"
            regionPoints[2] = lastLastPosition
        elif MODE == "3" and lastLastPosition != None:
            is_toggleable = True
            MODE = "is_toggleable"
            regionPoints[3] = lastLastPosition
            region_id = str(uuid.uuid4())
            claims.append({"type": "claim", "fact": [
                ["id", "0"], # Claim regions on #0 instead of get_my_id_str() so they are persisted
                ["id", "1"],
                ["text", "region"],
                ["text", region_id],
                ["text", "at"],
                ["integer", str(regionPoints[0][0])],
                ["integer", str(regionPoints[0][1])],
                ["integer", str(regionPoints[1][0])],
                ["integer", str(regionPoints[1][1])],
                ["integer", str(regionPoints[2][0])],
                ["integer", str(regionPoints[2][1])],
                ["integer", str(regionPoints[3][0])],
                ["integer", str(regionPoints[3][1])],
            ]})
            regionPoints = [None, None, None, None]
        logging.info("MODE: {}, region points: {}".format(MODE, regionPoints))
    elif MODE == "is_toggleable" and key == "enter":
        MODE = "naming"
        region_name = ""
        if is_toggleable:
            claims.append({"type": "claim", "fact": [
                ["id", "0"], # Claim regions on #0 instead of get_my_id_str() so they are persisted
                ["id", "1"],
                ["text", "region"],
                ["text", region_id],
                ["text", "is"],
                ["text", "toggleable"],
            ]})
    elif MODE == "naming":
        if key == "space":
            region_name += " "
        elif key == "backspace":
            region_name = region_name[:-1]  # remove last character
        elif key == "enter":
            MODE = "IDLE"
            if len(region_name) > 0:
                claims.append({"type": "claim", "fact": [
                    ["id", "0"], # Claim regions on #0 instead of get_my_id_str() so they are persisted
                    ["id", "1"],
                    ["text", "region"],
                    ["text", region_id],
                    ["text", "has"],
                    ["text", "name"],
                    ["text", region_name],
                ]})
    claims.extend(render_mode())
    batch(claims)


@subscription(["$ $ laser seen at $x $y @ $t"])
def sub_callback_laser_dots(results):
    global lastLastPosition, MODE, DRAW_TARGET
    claims = []
    claims.append({
        "type": "retract", "fact": [
            ["id", get_my_id_str()],
            ["id", "2"],
            ["postfix", ""],
        ]
    })
    if results and len(results) > 0:
        result = results[0]
        lastLastPosition = [int(result["x"]), int(result["y"])]
        if MODE in ["0", "1", "2", "3"]:
            ill = Illumination()
            ill.stroke(255, 0, 255, 128)
            ill.fill(255, 0, 255, 100)
            current_corner = int(MODE)
            poly = regionPoints[:current_corner] + [lastLastPosition]
            projected_poly = list(map(lambda p: project(LASER_CAMERA_ID, p[0], p[1]), poly))
            ill.polygon(projected_poly)
            SIZE = 5
            for pt in projected_poly:
                ill.ellipse(pt[0] - SIZE, pt[1] - SIZE, SIZE * 2, SIZE * 2)
            claims.append(ill.to_batch_claim(get_my_id_str(), "2", DRAW_TARGET))
    else:
        lastLastPosition = None
    batch(claims)

init(__file__)
