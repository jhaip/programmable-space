from helper import init, claim, retract, prehook, subscription, batch, MY_ID_STR, listen, check_server_connection, get_my_id_pre_init
from PIL import Image, ImageDraw, ImageFont
from IT8951 import constants
from IT8951.display import AutoEPDDisplay
from os import path
from collections import deque
from datetime import datetime
import threading
import time
import json
import logging

last_graphics = deque(maxlen=1)
graphics_map = {}

def display_image_8bpp(display):
    img_path = 'images/sleeping_penguin.png'
    print('Displaying "{}"...'.format(img_path))
    # clearing image to white
    display.frame_buf.paste(0xFF, box=(0, 0, display.width, display.height))
    img = Image.open(img_path)
    dims = (display.width, display.height)
    img.thumbnail(dims)
    paste_coords = [0, 0]
    display.frame_buf.paste(img, paste_coords)
    display.draw_full(constants.DisplayModes.GC16)


def draw_text(img, text, x, y, fontsize=80):
    draw = ImageDraw.Draw(img)
    # TODO: cache loaded fonts
    try:
        font_path = path.join(path.dirname(path.dirname(__file__)), 'files/Inconsolata-Regular.ttf')
        font = ImageFont.truetype(font_path, fontsize)
    except OSError:
        font = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', fontsize)
    draw.text((x, y), text, font=font)


def draw(display, graphics):
    font_size = 72
    for g in graphics:
        opt = g["options"]
        command_type = g["type"]
        if command_type == "text":
            if not opt:
                logging.error("would draw text but missing opt")
                continue
            lines = str(opt["text"]).split("\n")
            line_height = font_size * 1.3
            for i, l in enumerate(lines):
                draw_text(display.frame_buf, l, opt["x"], opt["y"] + i * line_height, font_size)
        elif command_type == "fontsize":
            if opt:
                font_size = opt


def draw_thread(q):
    print('Initializing EPD...')
    logging.info('Initializing EPD...')
    # here, spi_hz controls the rate of data transfer to the device, so a higher
    # value means faster display refreshes. the documentation for the IT8951 device
    # says the max is 24 MHz (24000000), but my device seems to still work as high as
    # 80 MHz (80000000)
    rotate = None
    display = AutoEPDDisplay(vcom=-1.32, rotate=rotate, spi_hz=24000000)
    partial_update_draw_count = 0
    last_drawn_graphics = None
    last_clear = datetime.now()
    last_total_reset = datetime.now()
    while True:
        try:
            graphics = q.pop()
            logging.error("drawing updated graphics")
            last_drawn_graphics = graphics
            partial_update_draw_count += 1
            if partial_update_draw_count > 10:
                partial_update_draw_count = 0
                display.frame_buf.paste(0xFF, box=(0, 0, display.width, display.height))
                draw(display, graphics)
                display.draw_full(constants.DisplayModes.GC16)
            else:
                # clearing image to white
                display.frame_buf.paste(0xFF, box=(0, 0, display.width, display.height))
                draw(display, graphics)
                display.draw_partial(constants.DisplayModes.DU)
        except IndexError:
            time.sleep(0.01)
            if (datetime.now() - last_total_reset).total_seconds() > 60*60*6: # 6 hours
                logging.error("REINIT EINK DISPLAY")
                display = AutoEPDDisplay(vcom=-1.32, rotate=rotate, spi_hz=24000000)
                last_total_reset = datetime.now()
            if (datetime.now() - last_clear).total_seconds() > 60:
                display.clear()
                if last_drawn_graphics is not None:
                    draw(display, last_drawn_graphics)
                    display.draw_full(constants.DisplayModes.GC16)
                last_clear = datetime.now()

@prehook
def my_prehook():
    batch_claims = []
    batch_claims.append({"type": "death", "fact": [
        ["id", get_my_id_pre_init(__file__)],
    ]})
    batch(batch_claims)
    logging.error("cleaning my old subs")

@subscription(["$ $ draw graphics $graphics on 1999"]) # get_my_id_pre_init(__file__)])
def sub_callback_graphics(results):
    global graphics_map, last_graphics
    # logging.info("sub_callback_graphics")
    # logging.info(results)

    new_graphics = []
    new_graphics_map = {}
    # Here we should calculate if we should do a partial or a full refresh?
    # or maybe we always do a partial and then every Nth update do a full?
    for v in results:
        graphics_list = json.loads(v["graphics"])
        new_graphics.extend(graphics_list)
        for g in graphics_list:
            new_graphics_map[json.dumps(g)] = True
    
    if new_graphics_map != graphics_map:
        graphics_map = new_graphics_map
        last_graphics.append(new_graphics)
        logging.error("updated graphics")

worker = threading.Thread(target=draw_thread, args=(last_graphics,))
worker.setDaemon(True)
worker.start()

init(__file__)
