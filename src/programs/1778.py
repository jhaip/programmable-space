import time
import board
import analogio
import random
# from progspace_room import Room
from adafruit_circuitplayground import cp

# room = Room(use_debug=True)

while True:
    while True: # while room.connected():
        time.sleep(2+random.random()*5)
        cp.play_tone(240 + random.randint(0, 60), random.random()*0.4)
        cp.play_tone(240 + random.randint(0, 60), random.random()*0.4)
        cp.play_tone(240 + random.randint(0, 60), random.random()*0.4)











