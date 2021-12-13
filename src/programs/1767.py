import time
import board
from digitalio import DigitalInOut, Direction, Pull
from analogio import AnalogOut

direction_pin = DigitalInOut(board.D0)
direction_pin.direction = Direction.OUTPUT
analog_out = AnalogOut(board.A0)

while True:
    time.sleep(1)
    print("hey")
    direction_pin.value = False
    analog_out.value = 43690
    time.sleep(0.01)
    analog_out.value = 0
