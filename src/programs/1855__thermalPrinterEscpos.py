from helper import init, claim, retract, prehook, subscription, batch, get_my_id_str
from escpos import *
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
from datetime import datetime
import logging
import base64
import traceback
import requests

p = printer.Usb(0x04b8, 0x0e15)

@prehook
def room_prehook_callback():
    batch([{"type": "death", "fact": [["id", get_my_id_str()]]}])

@subscription(["$ $ wish $filePath would be thermal printed on epson"])
def sub_callback(results):
    global p
    claims = []
    claims.append({"type": "retract", "fact": [
        ["variable", ""],
        ["variable", ""],
        ["text", "wish"],
        ["variable", ""],
        ["text", "would"],
        ["text", "be"],
        ["text", "thermal"],
        ["text", "printed"],
        ["text", "on"],
        ["text", "epson"],
    ]})
    batch(claims)
    for result in results:
        logging.info("PRINTING {} {}".format(datetime.now().isoformat(), result["filePath"]))
        try:
            url = result["filePath"]
            if "http" in result["filePath"] is False:
                url = "http://192.168.1.34:5000/{}".format(result["filePath"])
            PIL_image = Image.open(requests.get(url, stream=True).raw)
            p.image(PIL_image)
            p.cut()
        except Exception as e:
            logging.error(traceback.format_exc())

init(__file__)