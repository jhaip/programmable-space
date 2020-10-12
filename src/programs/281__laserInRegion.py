from helper2 import init, claim, retract, prehook, subscription, batch, MY_ID_STR, listen, check_server_connection, get_my_id_str
from graphics import Illumination
import logging

def point_inside_polygon(x, y, poly):
    # Copied from http://www.ariel.com.au/a/python-point-int-poly.html
    n = len(poly)
    inside = False
    p1x,p1y = poly[0]
    for i in range(n+1):
        p2x,p2y = poly[i % n]
        if y > min(p1y,p2y):
            if y <= max(p1y,p2y):
                if x <= max(p1x,p2x):
                    if p1y != p2y:
                        xinters = (y-p1y)*(p2x-p1x)/(p2y-p1y)+p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x,p1y = p2x,p2y
    return inside

@subscription(["$ $ laser seen at $x $y @ $t on camera $cam", "$ $ region $regionId at $x1 $y1 $x2 $y2 $x3 $y3 $x4 $y4 on camera $cam"])
def sub_callback_laser_dots(results):
    claims = []
    claims.append({"type": "retract", "fact": [
        ["id", get_my_id_str()],
        ["id", "1"],
        ["postfix", ""],
    ]})
    for result in results:
        polygon = [[int(result["x1"]), int(result["y1"])],
                   [int(result["x2"]), int(result["y2"])],
                   [int(result["x3"]), int(result["y3"])],
                   [int(result["x4"]), int(result["y4"])]]
        inside = point_inside_polygon(int(result["x"]), int(result["y"]), polygon)
        if inside:
            logging.info("laser {} {} inside region {}".format(result["x"], result["y"], result["regionId"]))
            claims.append({"type": "claim", "fact": [
                ["id", get_my_id_str()],
                ["id", "1"],
                ["text", "laser"],
                ["text", "in"],
                ["text", "region"],
                ["text", str(result["regionId"])],
            ]})
            claims.append({"type": "claim", "fact": [
                ["id", get_my_id_str()],
                ["id", "1"],
                ["text", "laser"],
                ["text", "in"],
                ["text", "region"],
                ["text", str(result["regionId"])],
                ["text", "@"],
                ["text", str(result["t"])],
            ]})
    batch(claims)

init(__file__)