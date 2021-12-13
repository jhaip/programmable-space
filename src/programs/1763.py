import time
import board
import analogio
import adafruit_thermistor
from progspace_room import Room

room = Room(use_debug=True)
thermistor = adafruit_thermistor.Thermistor(board.TEMPERATURE, 10000, 10000, 25, 3950)

while True:
    while room.connected():
        room.cleanup()
        room.claim('temp is {}'.format(thermistor.temperature))




