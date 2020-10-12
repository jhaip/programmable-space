from helper2 import init, claim, retract, prehook, subscription, batch, MY_ID_STR, listen, check_server_connection, get_my_id_str
import numpy as np
import cv2
import logging

@subscription(["$ $ region $id at $rx1 $ry1 $rx2 $ry2 $rx3 $ry3 $rx4 $ry4 on camera $cam",
               "$ $ region $id has name calibration",
               "$ $ camera $cam should calibrate to $sx1 $sy1 $sx2 $sy2 $sx3 $sy3 $sx4 $sy4 on display $display"])
def sub_callback_calibration_points(results):
    claims = [{
        "type": "retract", "fact": [["id", get_my_id_str()], ["id", "0"], ["postfix", ""]]
    }]
    if results and len(results) > 0:
        for result in results:
            src = np.float32([
                [result["rx1"], result["ry1"]],
                [result["rx2"], result["ry2"]],
                [result["rx4"], result["ry4"]],
                [result["rx3"], result["ry3"]] # notice the order is not clock-wise
            ])
            dst = np.float32([
                [result["sx1"], result["sy1"]],
                [result["sx2"], result["sy2"]],
                [result["sx4"], result["sy4"]],
                [result["sx3"], result["sy3"]] # notice the order is not clock-wise
            ])
            homography_matrix = cv2.getPerspectiveTransform(src, dst)
            claims.append({"type": "claim", "fact": [
                ["id", get_my_id_str()],
                ["id", "0"],
                ["text", "camera"],
                ["text", str(result["cam"])],
                ["text", "calibration"],
                ["text", "for"],
                ["text", str(result["display"])],
                ["text", "is"],
                ["float", str(homography_matrix[0][0])],
                ["float", str(homography_matrix[0][1])],
                ["float", str(homography_matrix[0][2])],
                ["float", str(homography_matrix[1][0])],
                ["float", str(homography_matrix[1][1])],
                ["float", str(homography_matrix[1][2])],
                ["float", str(homography_matrix[2][0])],
                ["float", str(homography_matrix[2][1])],
                ["float", str(homography_matrix[2][2])],
            ]})            
    batch(claims)


init(__file__)
