from helper2 import init, claim, retract, prehook, subscription, batch, MY_ID_STR, listen, check_server_connection, get_my_id_str
from graphics import Illumination
import numpy as np
import cv2
import uuid
import logging

MODE = "IDLE"
CURRENT_CAMERA_TARGET = None
lastLastPosition = None
regionPoints = [None, None, None, None]
region_id = None
ignore_key_press = True
is_toggleable = True
region_name = ""
projection_matrixes = {}
camera_to_display_map = {}

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

@subscription(["$ $ camera $cameraId calibration for $displayId is $M1 $M2 $M3 $M4 $M5 $M6 $M7 $M8 $M9"])
def sub_callback_calibration(results):
    global projection_matrixes, camera_to_display_map
    logging.info(results)
    if results:
        for result in results:
            projection_matrixes[str(result["cameraId"])] = np.float32([
                [float(result["M1"]), float(result["M2"]), float(result["M3"])],
                [float(result["M4"]), float(result["M5"]), float(result["M6"])],
                [float(result["M7"]), float(result["M8"]), float(result["M9"])]])
            camera_to_display_map[str(result["cameraId"])] = str(result["displayId"])

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
        is_toggleable_text = "yes" if is_toggleable else "no"
        ill.text(0, 0, "Should region\nbe a toggle?\ny/n -> {}\npress enter\nto accept".format(is_toggleable_text))
    elif MODE == "naming":
        region_name_text = region_name if region_name else "..."
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
                ["text", "on"],
                ["text", "camera"],
                ["text", str(CURRENT_CAMERA_TARGET)],
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


@subscription(["$ $ laser seen at $x $y @ $t on camera $cameraId"])
def sub_callback_laser_dots(results):
    global lastLastPosition, MODE, CURRENT_CAMERA_TARGET
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
        if MODE in ["0", "1", "2", "3"]:
            CURRENT_CAMERA_TARGET = str(result["cameraId"])
            lastLastPosition = [int(result["x"]), int(result["y"])]
            ill = Illumination()
            ill.stroke(255, 0, 255, 128)
            ill.fill(255, 0, 255, 100)
            current_corner = int(MODE)
            poly = regionPoints[:current_corner] + [lastLastPosition]
            projected_poly = list(map(lambda p: project(CURRENT_CAMERA_TARGET, p[0], p[1]), poly))
            if len(poly) >= 3:
                ill.polygon(projected_poly)
            SIZE = 5
            for pt in projected_poly:
                ill.ellipse(pt[0] - SIZE, pt[1] - SIZE, SIZE * 2, SIZE * 2)
            draw_target = get_my_id_str()
            if CURRENT_CAMERA_TARGET in camera_to_display_map:
                draw_target = camera_to_display_map[CURRENT_CAMERA_TARGET]
            claims.append(ill.to_batch_claim(get_my_id_str(), "2", draw_target))
    else:
        lastLastPosition = None
    batch(claims)

init(__file__)
