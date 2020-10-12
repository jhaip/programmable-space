import time
import logging
import math
import datetime
from helper2 import init, claim, retract, prehook, subscription, batch, get_my_id_str
from graphics import Illumination

@prehook
def my_prehook():
    batch_claims = []
    batch_claims.append({"type": "retract", "fact": [
        ["id", get_my_id_str()],
        ["postfix", ""],
    ]})
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
        ["integer", "0"],
        ["text", ","],
        ["integer", "0"],
        ["text", ")"],
        ["text", "TR"],
        ["text", "("],
        ["integer", "1920"],
        ["text", ","],
        ["integer", "0"],
        ["text", ")"],
        ["text", "BR"],
        ["text", "("],
        ["integer", "1920"],
        ["text", ","],
        ["integer", "1080"],
        ["text", ")"],
        ["text", "BL"],
        ["text", "("],
        ["integer", "0"],
        ["text", ","],
        ["integer", "1080"],
        ["text", ")"],
        ["text", "@"],
        ["integer", str(int(round(time.time() * 1000)))],
    ]})
    batch_claims.append({"type": "claim", "fact": [
        ["id", get_my_id_str()],
        ["id", "0"],
        ["text", "camera"],
        ["integer", "1"],
        ["text", "sees"],
        ["text", "paper"],
        ["integer", str(int(get_my_id_str()))],
        ["text", "at"],
        ["text", "TL"],
        ["text", "("],
        ["integer", "500"],
        ["text", ","],
        ["integer", "500"],
        ["text", ")"],
        ["text", "TR"],
        ["text", "("],
        ["integer", "900"],
        ["text", ","],
        ["integer", "500"],
        ["text", ")"],
        ["text", "BR"],
        ["text", "("],
        ["integer", "900"],
        ["text", ","],
        ["integer", "800"],
        ["text", ")"],
        ["text", "BL"],
        ["text", "("],
        ["integer", "500"],
        ["text", ","],
        ["integer", "800"],
        ["text", ")"],
        ["text", "@"],
        ["integer", str(int(round(time.time() * 1000)))],
    ]})
    ill = Illumination()
    ill.push()
    ill.fill("red")
    ill.rect(0, 0, 50, 50)
    ill.fill(0, 0, 255)
    ill.strokewidth(5)
    ill.ellipse(0, 0, 50, 50)
    ill.fontcolor(255, 255, 0)
    ill.text(25, 25, "Hello World!")
    ill.fontcolor(100, 100, 100, 100)
    ill.text(25, 25, "          █")
    ill.nostroke()
    ill.rect(100, 10, 60, 60)
    ill.stroke("green")
    ill.nofill()
    ill.polygon([[200, 10], [300, 10], [250, 50]])
    ill.fill(255, 255, 255, 50)
    ill.polygon([[300, 10], [400, 10], [350, 50]])
    ill.pop()
    ill.push()
    ill.translate(50, 200)
    ill.line(0, 0, 100, 0)
    ill.pop()
    ill.push()
    ill.translate(200, 200)
    ill.rotate(math.pi / 4.0)
    ill.line(0, 0, 100, 0)
    ill.pop()
    ill.push()
    ill.translate(300, 200)
    ill.rotate(math.pi / 2.0)
    ill.line(0, 0, 200, 0)
    ill.pop()
    batch_claims.append(ill.to_batch_claim(get_my_id_str(), "0", "global"))
    batch_claims.append(ill.to_batch_claim(get_my_id_str(), "0"))
    batch(batch_claims)
    # batch([batch_claims[0]])

init(__file__)
