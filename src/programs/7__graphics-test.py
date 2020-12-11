import time
import logging
import math
import datetime
from helper import init, claim, retract, prehook, subscription, batch, get_my_id_str
from graphics import Illumination

@prehook
def my_prehook():
    batch_claims = []
    batch_claims.append({"type": "retract", "fact": [
        ["id", get_my_id_str()],
        ["postfix", ""],
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
    batch_claims.append(ill.to_batch_claim(get_my_id_str(), "0"))
    batch(batch_claims)

init(__file__)
