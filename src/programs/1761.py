import time
import board
import analogio
import neopixel

pixels = neopixel.NeoPixel(board.NEOPIXEL, 10, brightness=0.2, auto_write=False)

while True:
    for i in range(len(pixels)):
        pixels[i] = (0, 0, 200)
    pixels.show()












































