import time
import board
import analogio
from progspace_room import Room
from analogio import AnalogIn
 
analog_in = AnalogIn(board.A2)

room = Room(use_debug=True)

while True:
    while room.connected():
        room.cleanup()
        room.claim('soil is {}'.format(analog_in.value))
        time.sleep(1)



