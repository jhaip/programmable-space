import time
import board
import analogio
from progspace_room import Room
from adafruit_circuitplayground import cp

room = Room(use_debug=False)
prev_val = False

while True:
    while room.connected():
        if cp.button_a != prev_val:
            print("button change")
            prev_val = cp.button_a
            room.cleanup()
            if prev_val:
                print("claim pressed")
                room.claim('button is pressed')
            time.sleep(0.1)

