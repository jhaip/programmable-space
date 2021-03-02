from escpos import *
from PIL import Image, ImageDraw, ImageFont
p = printer.Usb(0x04b8, 0x0e15)
PAPER_WIDTH = 570
PAGE_SIZE = 440
MARGIN = 30
TITLE_FONT_SIZE = 36

def printFront(programId):
    img = Image.new('RGB', (PAGE_SIZE, PAPER_WIDTH), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    # Page edges
    d.line((0, 0, 0, PAPER_WIDTH), fill=50)
    d.line((PAGE_SIZE - 1, 0, PAGE_SIZE - 1, PAPER_WIDTH), fill=50)
    # Card title
    fnt_title = ImageFont.truetype('/Users/jacobhaip/Library/Fonts/Inconsolata-SemiCondensedMedium.ttf', TITLE_FONT_SIZE)
    fnt_description = ImageFont.truetype('/Users/jacobhaip/Library/Fonts/Inconsolata-SemiCondensedMedium.ttf', 24)
    d.text((MARGIN, 0), "#{}".format(programId), font=fnt_title, fill=(0, 0, 0))
    # Drawing rectange
    d.rectangle([(MARGIN, TITLE_FONT_SIZE+5), (PAGE_SIZE - MARGIN, PAPER_WIDTH/2 + TITLE_FONT_SIZE+5)], outline=128, width=3)
    # Description
    d.text((MARGIN, PAPER_WIDTH/2 + TITLE_FONT_SIZE+5 + 10), "DESCRIPTION:", font=fnt_description, fill=128)

    img_r=img.rotate(90,  expand=1)
    img_r.save('/tmp/code.png')
    p.image('/tmp/code.png')
    p.cut()

def printCode(text):
    fnt = ImageFont.truetype('/Users/jacobhaip/Library/Fonts/Inconsolata-SemiCondensedMedium.ttf', 16)
    lines = text.split("\n")
    img_height = 20*(len(lines)+2)
    img = Image.new('RGB', (PAPER_WIDTH, img_height), color=(255, 255, 255))
    d = ImageDraw.Draw(img)

    for y in range(int(img_height/PAGE_SIZE) + 1):
        d.line((0, y*PAGE_SIZE, PAPER_WIDTH, y*PAGE_SIZE), fill=50)

    for i in range(len(lines)):
        d.text((0, i*20), lines[i], font=fnt, fill=(0,0,0))
    img.save('/tmp/code.png')
    p.image('/tmp/code.png')
    p.cut()
	
text = """
Code for 1775.py

# SPDX-FileCopyrightText: 2019 Kattni Rembor, written for Adafruit Industries
#
# SPDX-License-Identifier: Unlicense
# CLUE Spirit Level Demo
import board
import displayio
from adafruit_display_shapes.circle import Circle
from adafruit_clue import clue

display = board.DISPLAY
clue_group = displayio.Group(max_size=4)

outer_circle = Circle(120, 120, 119, outline=clue.WHITE)
middle_circle = Circle(120, 120, 75, outline=clue.YELLOW)
inner_circle = Circle(120, 120, 35, outline=clue.GREEN)
clue_group.append(outer_circle)
clue_group.append(middle_circle)
clue_group.append(inner_circle)

x, y, _ = clue.acceleration
bubble_group = displayio.Group(max_size=1)
level_bubble = Circle(int(x + 120), int(y + 120), 20, fill=clue.RED, outline=clue.RED)
bubble_group.append(level_bubble)

clue_group.append(bubble_group)
display.show(clue_group)

while True:
    x, y, _ = clue.acceleration
    bubble_group.x = int(x * -10)
    bubble_group.y = int(y * -10)

"""

printFront(1775)
printCode(text)
