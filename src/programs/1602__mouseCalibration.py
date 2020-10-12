from helper2 import init, claim, retract, prehook, subscription, batch, MY_ID_STR, listen, check_server_connection, get_my_id_str
import time
import cv2

CAM_WIDTH = 1920
CAM_HEIGHT = 1080
projector_calibration_state = None
projector_calibration = [(50, 50), (CAM_WIDTH-50, 50),
                         (CAM_WIDTH-50, CAM_HEIGHT-50),
                         (50, CAM_HEIGHT-50)]

def mouse_drawing(event, x, y, flags, params):
    if event == cv2.EVENT_LBUTTONDOWN:
        moveCurrentCalibrationPoint((x,y))

def draw_str(dst, target, s):
    x, y = target
    cv2.putText(dst, s, (x+1, y+1), cv2.FONT_HERSHEY_PLAIN, 1.2, (0, 0, 0), thickness = 2, lineType=cv2.LINE_AA)
    cv2.putText(dst, s, (x, y), cv2.FONT_HERSHEY_PLAIN, 1.2, (255, 255, 255), lineType=cv2.LINE_AA)

def moveCurrentCalibrationPointRel(x, y):
    if projector_calibration_state is not None:
        prev = projector_calibration[projector_calibration_state]
        projector_calibration[projector_calibration_state] = (prev[0] + dx, prev[1] + dy)
        claimProjectorCalibration()

def moveCurrentCalibrationPoint(pt):
    if projector_calibration_state is not None:
        projector_calibration[projector_calibration_state] = (pt[0], pt[1])
        claimProjectorCalibration()

def claimProjectorCalibration():
    batch_claims = [{"type": "retract", "fact": [
        ["id", get_my_id_str()], ["id", "0"], ["postfix", ""]
    ]}]
    batch_claims.append({"type": "claim", "fact": [
        ["id", get_my_id_str()],
        ["id", "0"],
        ["text", "camera"],
        ["integer", "1"],
        ["text", "has"],
        ["text", "projector"],
        ["text", "calibration"],
        ["text", "TL"],
        ["text", "("],
        ["integer", str(projector_calibration[0][0])],
        ["text", ","],
        ["integer", str(projector_calibration[0][1])],
        ["text", ")"],
        ["text", "TR"],
        ["text", "("],
        ["integer", str(projector_calibration[1][0])],
        ["text", ","],
        ["integer", str(projector_calibration[1][1])],
        ["text", ")"],
        ["text", "BR"],
        ["text", "("],
        ["integer", str(projector_calibration[2][0])],
        ["text", ","],
        ["integer", str(projector_calibration[2][1])],
        ["text", ")"],
        ["text", "BL"],
        ["text", "("],
        ["integer", str(projector_calibration[3][0])],
        ["text", ","],
        ["integer", str(projector_calibration[3][1])],
        ["text", ")"],
        ["text", "@"],
        ["integer", str(int(round(time.time() * 1000)))],
    ]})
    batch(batch_claims)

cap = cv2.VideoCapture(0)
cv2.namedWindow("Frame")
cv2.setMouseCallback("Frame", mouse_drawing)
_, frame = cap.read()
init(__file__, skipListening=True)

while True:
    dst = frame.copy()

    draw_str(dst, (10, 10), "Escape to exit")
    draw_str(dst, (10, 30), "c to capture new webcam image")
    draw_str(dst, (10, 50), "hjkl to adjust pixel")
    draw_str(dst, (10, 70), "1234 to select a corner")
    draw_str(dst, (10, 90), "` to stop editing")
    
    if projector_calibration_state is not None:
        cv2.circle(dst, projector_calibration[projector_calibration_state], 10, (0, 0, 255), 2)
        draw_str(dst, (CAM_WIDTH//2, CAM_HEIGHT//2), "EDITING CORNER {}".format(projector_calibration_state + 1))
    
    cv2.line(dst, projector_calibration[0], projector_calibration[1], (255, 0, 0), 2)
    cv2.line(dst, projector_calibration[1], projector_calibration[2], (255, 0, 0), 2)
    cv2.line(dst, projector_calibration[2], projector_calibration[3], (255, 0, 0), 2)
    cv2.line(dst, projector_calibration[3], projector_calibration[0], (255, 0, 0), 2)
    for pt in projector_calibration:
        cv2.circle(dst, pt, 5, (0, 0, 255), -1)

    cv2.imshow("Frame", dst)

    key = cv2.waitKey(10)
    if key == 27:
        break # escape
    elif key == ord("c"):
        _, frame = cap.read()
    elif key == ord("k"):
        moveCurrentCalibrationPointRel(0, -1)
    elif key == ord("l"):
        moveCurrentCalibrationPointRel(1, 0)
    elif key == ord("j"):
        moveCurrentCalibrationPointRel(0, 1)
    elif key == ord("h"):
        moveCurrentCalibrationPointRel(-1, 0)
    elif key == ord("`"):
        projector_calibration_state = None
    elif key in [ord("1"), ord("2"), ord("3"), ord("4")]:
        projector_calibration_state = [ord("1"), ord("2"), ord("3"), ord("4")].index(key)

cap.release()
cv2.destroyAllWindows()
