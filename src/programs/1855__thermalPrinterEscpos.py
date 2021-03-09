from helper import init, claim, retract, prehook, subscription, batch, get_my_id_str
from escpos import *
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
from datetime import datetime
import logging
import base64
import traceback

p = printer.Usb(0x04b8, 0x0e15)

@prehook
def room_prehook_callback():
    batch([{"type": "death", "fact": [["id", get_my_id_str()]]}])

@subscription(["$ $ wish $b64data would be thermal printed on epson"])
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
        logging.info("PRINTING {}".format(datetime.now().isoformat()))
        try:
            im_bytes = base64.b64decode(result["b64data"])
            im_file = BytesIO(im_bytes)
            PIL_image = Image.open(im_file)
            p.image(PIL_image)
            p.cut()
        except Exception as e:
            logging.error(traceback.format_exc())

init(__file__)