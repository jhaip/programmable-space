from helper import init, claim, retract, prehook, subscription, batch, MY_ID_STR, listen, check_server_connection, get_my_id_pre_init
from PIL import Image, ImageDraw, ImageFont
from IT8951 import constants
from IT8951.display import AutoEPDDisplay
import time
import json
import logging

graphics = []
graphics_map = {}

print('Initializing EPD...')
# here, spi_hz controls the rate of data transfer to the device, so a higher
# value means faster display refreshes. the documentation for the IT8951 device
# says the max is 24 MHz (24000000), but my device seems to still work as high as
# 80 MHz (80000000)
rotate = None
display = AutoEPDDisplay(vcom=-1.32, rotate=rotate, spi_hz=24000000)

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
        font = ImageFont.truetype('/usr/share/fonts/truetype/freefont/FreeSans.ttf', fontsize)
    except OSError:
        font = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', fontsize)
    draw.text((x, y), text, font=font)


def draw():
    global graphics
    # clearing image to white
    display.frame_buf.paste(0xFF, box=(0, 0, display.width, display.height))
    font_size = 80
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
    display.draw_full(constants.DisplayModes.GC16)


@subscription(["$ $ draw graphics $graphics on 1999"]) # get_my_id_pre_init(__file__)])
def sub_callback_graphics(results):
    global graphics, graphics_map
    logging.info("sub_callback_graphics")
    logging.info(results)

    new_graphics = []
    new_graphics_gap = {}
    # Here we should calculate if we should do a partial or a full refresh?
    # or maybe we always do a partial and then every Nth update do a full?
    for v in results:
        graphics_list = json.loads(v["graphics"])
        new_graphics.extend(graphics_list)
        for g in graphics_list:
            new_graphics_gap[json.dumps(g)] = True
    
    if new_graphics_map != graphics_map:
        graphics = new_graphics
        graphics_map = new_graphics_gap
        draw()

init(__file__)