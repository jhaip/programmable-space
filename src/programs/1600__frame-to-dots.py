# Example from https://stackoverflow.com/questions/14804741/opencv-integration-with-wxpython
from helper2 import init, claim, retract, prehook, subscription, batch, MY_ID_STR, listen, check_server_connection, get_my_id_str
import wx
from imutils.video import WebcamVideoStream
import imutils
import cv2
import time
import json
import zmq
import logging
import sys
import os

CAM_WIDTH = 1920
CAM_HEIGHT = 1080
MIN_LOOP_DELAY = 200 # 60
latency_check_delay_s = 5
server_latency_ms = 0
corners = None
dot_codes = None

@subscription(["$ $ ping $ $latencyMs"])
def sub_callback_papers(results):
    global server_latency_ms
    if results and len(results) > 0:
        server_latency_ms = results[0]["latencyMs"]


@subscription(["$ $ camera 1 sees corner $c of paper $p at ( $x , $y ) @ $"])
def sub_callback_corners(results):
    global corners
    corners = results


class ShowCapture(wx.Panel):
    def __init__(self, parent, capture, fps=1):
        global latency_check_delay_s
        wx.Panel.__init__(self, parent)

        self.capture = capture
        ret, frame = (True, self.capture.read())

        height, width = frame.shape[:2]
        parent.SetSize((width, height))
        logging.error("WINDOW SIZE: {} {}".format(width, height))
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        self.bmp = wx.Bitmap.FromBuffer(width, height, frame)
        self.dots = []

        self.projector_calibration_state = None
        self.blob_detector = self.createSimpleBlobDetector()

        self.projector_calibration = [(50, 50), (CAM_WIDTH-50, 50),
                                      (CAM_WIDTH-50, CAM_HEIGHT-50),
                                      (50, CAM_HEIGHT-50)]

        self.listenTimer = wx.Timer(self)
        self.listenTimer.Start(int(latency_check_delay_s*1000))
        self.Bind(wx.EVT_TIMER, self.onLatencyCheckTimer)

        self.MyListenDrawLoop()

        self.Bind(wx.EVT_PAINT, self.OnPaint)

        self.Bind(wx.EVT_KEY_DOWN, self.OnKeyDown)
        self.Bind(wx.EVT_KEY_UP, self.OnKeyDown)
        self.Bind(wx.EVT_CHAR, self.OnKeyDown)
        self.Bind(wx.EVT_LEFT_UP, self.onClick)
        self.SetFocus()
    
    def onLatencyCheckTimer(self, event):
        print("listening...")
        more_messages_to_receive = True
        while more_messages_to_receive:
            more_messages_to_receive = listen(blocking=False)
    
    def MyListenDrawLoop(self):
        global server_latency_ms, MIN_LOOP_DELAY
        self.NextFrame(None)
        delay = max(MIN_LOOP_DELAY, server_latency_ms*5 + MIN_LOOP_DELAY)
        wx.CallLater(delay, self.MyListenDrawLoop)
        print("loop with delay {}".format(delay))
    
    def claimProjectorCalibration(self):
        batch_claims = [{"type": "retract", "fact": [
            ["id", get_my_id_str()],
            ["id", "0"],
            ["postfix", ""]
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
            ["integer", str(self.projector_calibration[0][0])],
            ["text", ","],
            ["integer", str(self.projector_calibration[0][1])],
            ["text", ")"],
            ["text", "TR"],
            ["text", "("],
            ["integer", str(self.projector_calibration[1][0])],
            ["text", ","],
            ["integer", str(self.projector_calibration[1][1])],
            ["text", ")"],
            ["text", "BR"],
            ["text", "("],
            ["integer", str(self.projector_calibration[2][0])],
            ["text", ","],
            ["integer", str(self.projector_calibration[2][1])],
            ["text", ")"],
            ["text", "BL"],
            ["text", "("],
            ["integer", str(self.projector_calibration[3][0])],
            ["text", ","],
            ["integer", str(self.projector_calibration[3][1])],
            ["text", ")"],
            ["text", "@"],
            ["integer", str(int(round(time.time() * 1000)))],
        ]})
        batch(batch_claims)
    
    def DrawCorner(self, dc, paper_id, corner_id, x, y):
        global dot_codes
        dot_codes_index = int(8400/4)*corner_id + paper_id
        code = dot_codes[dot_codes_index]
        dot_size = 8
        for i, el in enumerate(code):
            if int(el) == 0:
                dc.SetBrush(wx.Brush(wx.Colour(255, 0, 0)))
            elif int(el) == 1:
                dc.SetBrush(wx.Brush(wx.Colour(0, 255, 0)))
            elif int(el) == 2:
                dc.SetBrush(wx.Brush(wx.Colour(0, 0, 255)))
            else:
                dc.SetBrush(wx.Brush(wx.Colour(0, 0, 0)))
            dc.DrawEllipse(x+i*dot_size, y, dot_size, dot_size)

    def OnPaint(self, evt):
        global corners
        dc = wx.BufferedPaintDC(self)
        dc.SetBrush(wx.Brush())
        font =  dc.GetFont()
        font.SetWeight(wx.FONTWEIGHT_BOLD)
        dc.SetFont(font)

        dc.DrawBitmap(self.bmp, 0, 0)

        for dot in self.dots:
            dc.SetBrush(wx.Brush(wx.Colour(dot["color"][0], dot["color"][1], dot["color"][2])))
            # dc.SetBrush(wx.Brush(wx.Colour(255, 0, 0)))
            dc.SetPen(wx.Pen(wx.Colour(255, 0, 0)))
            s = 3
            dc.DrawEllipse(int(dot["x"])-s, int(dot["y"])-s, s*2, s*2)
        
        if corners:
            for corner in corners:
                cx = int(corner["x"])
                cy = int(corner["y"])
                s = 5
                dc.SetBrush(wx.Brush(wx.Colour(255, 0, 0)))
                dc.SetPen(wx.Pen(wx.Colour(255, 0, 0)))
                # dc.DrawLine(cx-s, cy-s, cx+s, cy+s)
                # dc.DrawLine(cx+s, cy-s, cx-s, cy+s)
                dc.DrawText("{}.{}".format(corner["p"], corner["c"]), cx+8, cy+8)
                self.DrawCorner(dc, int(corner["p"]), int(corner["c"]), cx+8, cy+24)

        dc.SetBrush(wx.Brush(wx.Colour(0,255,255), style=wx.BRUSHSTYLE_TRANSPARENT))
        dc.SetPen(wx.Pen(wx.Colour(0,0,255)))
        dc.DrawPolygon(self.projector_calibration)

        if self.projector_calibration_state is not None:
            pt = self.projector_calibration[self.projector_calibration_state]
            dc.SetBrush(wx.Brush(wx.Colour(0,255,255), style=wx.BRUSHSTYLE_TRANSPARENT))
            dc.SetPen(wx.Pen(wx.Colour(255, 255, 255)))
            s = 3
            dc.DrawEllipse(int(pt[0])-s, int(pt[1])-s, s*2, s*2)
            dc.SetPen(wx.Pen(wx.Colour(0, 0, 0)))
            s = s + 1
            dc.DrawEllipse(int(pt[0])-s, int(pt[1])-s, s*2, s*2)
            dc.SetPen(wx.Pen(wx.Colour(255, 255, 255)))
            s = s + 1
            dc.DrawEllipse(int(pt[0])-s, int(pt[1])-s, s*2, s*2)
            dc.DrawText("EDITING CORNER " + str(self.projector_calibration_state), CAM_WIDTH/2, CAM_HEIGHT/2)

    def createSimpleBlobDetector(self):
        params = cv2.SimpleBlobDetector_Params()
        params.minThreshold = 50 # 150
        params.maxThreshold = 230 # 200
        params.filterByCircularity = True
        params.minCircularity = 0.5
        params.filterByArea = True
        params.minArea = 9
        params.filterByInertia = False
        is_v2 = cv2.__version__.startswith("2.")
        if is_v2:
            detector = cv2.SimpleBlobDetector(params)
        else:
            detector = cv2.SimpleBlobDetector_create(params)
        return detector

    def NextFrame(self, event):
        start = time.time()

        ret, frame = (True, self.capture.read())
        if ret:
            keypoints = self.blob_detector.detect(frame)

            # print(self.keypoints)
            def keypointMapFunc(keypoint):
                # color = frame[int(keypoint.pt[1]), int(keypoint.pt[0])]
                colorSum = [0, 0, 0]
                N_H_SAMPLES = 1
                N_V_SAMPLES = 1
                TOTAL_SAMPLES = (2*N_H_SAMPLES+1) * (2*N_V_SAMPLES+1)
                for i in range(-N_H_SAMPLES, N_H_SAMPLES+1):
                    for j in range(-N_V_SAMPLES, N_V_SAMPLES+1):
                        color = frame[int(keypoint.pt[1])+i, int(keypoint.pt[0])+j]
                        colorSum[0] += int(color[0])
                        colorSum[1] += int(color[1])
                        colorSum[2] += int(color[2])
                return {
                    "x": int(keypoint.pt[0]),
                    "y": int(keypoint.pt[1]),
                    "color": [int(colorSum[2]/TOTAL_SAMPLES),
                              int(colorSum[1]/TOTAL_SAMPLES),
                              int(colorSum[0]/TOTAL_SAMPLES)]
                }
            self.dots = list(map(keypointMapFunc, keypoints))
            # print(self.dots)

            batch_claims = [{"type": "retract", "fact": [
                            ["id", get_my_id_str()],
                            ["id", "22"],
                            ["postfix", ""]
                            ]}]
            for dot in self.dots:
                batch_claims.append({"type": "claim", "fact": [
                    ["id", get_my_id_str()], ["id", "22"], ["text", "dots"],
                    ["float", str(dot["x"])], ["float", str(dot["y"])],
                    ["text", "color"],
                    ["float", str(dot["color"][0])], ["float", str(dot["color"][1])], ["float", str(dot["color"][2])],
                    ["integer", str(int(time.time()*1000.0))]
                ]})
            batch(batch_claims)

            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            self.bmp.CopyFromBuffer(frame)
            #
            # img = wx.Bitmap.ConvertToImage( self.bmp )
            # img_str = img.GetData()
            # self.M.set_image(img_str)
            #
            self.Refresh()

        end = time.time()
        logging.error("{} {} fps".format(end - start, 1.0/(end - start)))

    def moveCurrentCalibrationPointRel(self, dx, dy):
        if self.projector_calibration_state is not None:
            prev = self.projector_calibration[self.projector_calibration_state]
            next = (prev[0] + dx, prev[1] + dy)
            self.projector_calibration[self.projector_calibration_state] = next
            self.claimProjectorCalibration()

    def moveCurrentCalibrationPoint(self, pt):
        if self.projector_calibration_state is not None:
            self.projector_calibration[self.projector_calibration_state] = (pt[0], pt[1])
            self.claimProjectorCalibration()

    def changeCurrentCalibrationPoint(self, key):
        if key == '`':
            self.projector_calibration_state = None
        elif key in ['1', '2', '3', '4']:
            self.projector_calibration_state = int(key)-1

    def OnKeyDown(self, event=None):
        keyCode = event.GetKeyCode()
        if keyCode == wx.WXK_UP:
            self.moveCurrentCalibrationPointRel(0, -1)
        elif keyCode == wx.WXK_RIGHT:
            self.moveCurrentCalibrationPointRel(1, 0)
        elif keyCode == wx.WXK_DOWN:
            self.moveCurrentCalibrationPointRel(0, 1)
        elif keyCode == wx.WXK_LEFT:
            self.moveCurrentCalibrationPointRel(-1, 0)
        else:
            unicodeKey = chr(event.GetUnicodeKey())
            if unicodeKey in ['`', '1', '2', '3', '4']:
                self.changeCurrentCalibrationPoint(unicodeKey)

    def onClick(self, event=None):
        if event:
            pt = event.GetPosition()
            self.moveCurrentCalibrationPoint(pt)


# capture = cv2.VideoCapture(0)
# capture.set(cv2.CAP_PROP_FRAME_WIDTH, CAM_WIDTH)
# capture.set(cv2.CAP_PROP_FRAME_HEIGHT, CAM_HEIGHT)
capture = WebcamVideoStream(src=0)
# time.sleep(2)
logging.error("Default settings:")
logging.error(capture.stream.get(cv2.CAP_PROP_FRAME_WIDTH))
logging.error(capture.stream.get(cv2.CAP_PROP_FRAME_HEIGHT))
logging.error(capture.stream.get(cv2.CAP_PROP_FOURCC))
logging.error(capture.stream.get(cv2.CAP_PROP_FORMAT))
logging.error(capture.stream.get(cv2.CAP_PROP_MODE))
logging.error(capture.stream.get(cv2.CAP_PROP_SETTINGS))
logging.error(capture.stream.get(cv2.CAP_PROP_FPS))
logging.error(capture.stream.get(cv2.CAP_PROP_BRIGHTNESS))
logging.error(capture.stream.get(cv2.CAP_PROP_CONTRAST))
logging.error(capture.stream.get(cv2.CAP_PROP_SATURATION))
logging.error(capture.stream.get(cv2.CAP_PROP_HUE))
logging.error(capture.stream.get(cv2.CAP_PROP_GAIN))
logging.error(capture.stream.get(cv2.CAP_PROP_EXPOSURE))
logging.error(capture.stream.get(cv2.CAP_PROP_AUTOFOCUS))
logging.error("---")

# capture.start()
# capture.read()

# time.sleep(2)
capture.stream.set(cv2.CAP_PROP_FRAME_WIDTH, CAM_WIDTH)
capture.stream.set(cv2.CAP_PROP_FRAME_HEIGHT, CAM_HEIGHT)
capture.stream.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc('M', 'P', 'E', 'G'))
# capture.stream.set(cv2.CAP_PROP_FPS, TODO)
# capture.stream.set(cv2.CAP_PROP_BRIGHTNESS, 0)
# capture.stream.set(cv2.CAP_PROP_CONTRAST, TODO)
# capture.stream.set(cv2.CAP_PROP_SATURATION, TODO)
# capture.stream.set(cv2.CAP_PROP_HUE, TODO)
# capture.stream.set(cv2.CAP_PROP_GAIN, TODO)
# capture.stream.set(cv2.CAP_PROP_EXPOSURE, TODO)
time.sleep(2)
capture.start()
time.sleep(2)

# for i in range(10):
#     capture.read()

if __name__ == '__main__':
    dot_codes_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'files/dot-codes.txt')
    with open(dot_codes_path) as f:
        dot_codes = [line.rstrip('\n') for line in f]
    init(__file__, skipListening=True)
    app = wx.App()
    frame = wx.Frame(None)
    cap = ShowCapture(frame, capture)
    frame.Show()
    app.MainLoop()
