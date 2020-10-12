from helper2 import init, claim, retract, prehook, subscription, batch, get_my_id_str
import time
from adafruit_crickit import crickit

init(__file__, skipListening=True)

# make two variables for the motors to make code shorter to type
motor_1 = crickit.dc_motor_1
motor_2 = crickit.dc_motor_2
speed_1 = 0.4
speed_2 = speed_1
 
while True:
    motor_1.throttle = speed
    motor_2.throttle = -speed_2
    time.sleep(1)
 
    motor_1.throttle = 0
    motor_2.throttle = 0
    time.sleep(2)
 
    motor_1.throttle = -speed
    motor_2.throttle = speed_2
    time.sleep(1)
 
    motor_1.throttle = 0
    motor_2.throttle = 0
    time.sleep(2)
