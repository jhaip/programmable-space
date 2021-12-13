import time
import board
import analogio
import adafruit_thermistor
import neopixel
from progspace_room import Room

room = Room(use_debug=False)
thermistor = adafruit_thermistor.Thermistor(board.TEMPERATURE, 10000, 10000, 25, 3950)
light = analogio.AnalogIn(board.LIGHT)
pixels = neopixel.NeoPixel(board.NEOPIXEL, 10, brightness=0.2, auto_write=False)

def scale(value):
    """Scale the light sensor values from 0-65535 (AnalogIn range)
    to 0-50 (arbitrarily chosen to plot well with temperature)"""
    return value / 65535 * 50

def when_callback(results):
    print("WHEN CALLBACK: {}".format(results))
    if len(results) > 0 and 't' in results[0]:
        try:
            t = int(results[0]['t'])
            for i in range(len(pixels)):
                if t % len(pixels) == i:
                    pixels[i] = (0, 255, 0)
                else:
                    pixels[i] = (0, 0, 0)
            pixels.show()
        except:
            pass

room.when(['$ $ time is $t'], when_callback)

while True:
    x = 0
    while room.connected():
        # print(room.subscription_ids.keys())
        lv = scale(light.value)
        # print(lv, thermistor.temperature)
        x += 1
        if x > 5000:
            print("claiming")
            room.cleanup()
            room.claim('light is {}'.format(scale(light.value)))
            x = 0
        # room.claim('temp is {}'.format(thermistor.temperature))














