from escpos import *
from PIL import Image, ImageDraw, ImageFont
p = printer.Usb(0x04b8, 0x0e15)

def printCode(text):
    fnt = ImageFont.truetype('/Users/jhaip/Library/Fonts/Inconsolata-SemiCondensedMedium.ttf', 16)
    lines = text.split("\n")
    img = Image.new('RGB', (570, 20*(len(lines)+2)), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
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

printCode(text)
