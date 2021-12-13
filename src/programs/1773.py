import time
import board
import analogio
from progspace_room import Room

room = Room(use_debug=True)

while True:
    while room.connected():
        room.cleanup()
        room.claim('temp is {}'.format(5))
        time.sleep(1)



