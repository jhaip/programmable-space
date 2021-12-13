import time
import board
import analogio
import adafruit_thermistor
import neopixel
from progspace_room import Room

room = Room(use_debug=True)
thermistor = adafruit_thermistor.Thermistor(board.TEMPERATURE, 10000, 10000, 25, 3950)
pixels = neopixel.NeoPixel(board.NEOPIXEL, 10, brightness=0.2, auto_write=False)

while True:
    while room.connected():
        room.cleanup()
        room.claim('temp is {}'.format(thermistor.temperature))
        for i in range(len(pixels)):
            pixels[i] = (0, 0, 255)
        pixels.show()










