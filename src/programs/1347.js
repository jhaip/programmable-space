const { room, myId, run } = require('../helper2')(__filename);

room.cleanup()
room.assert(`hey11`)

const code = `
from helper2 import init
import time
from adafruit_crickit import crickit

init(__file__, skipListening=True)

motor_1 = crickit.dc_motor_1
motor_2 = crickit.dc_motor_2
speed_1 = 0.4
speed_2 = speed_1

def move(c1, c2, t):
    motor_1.throttle = speed_1 * c1
    motor_2.throttle = speed_2 * c2
    time.sleep(t)

move(1, 1, 1)
move(0, 0, 1)
move(-1, -1, 1)
move(0, 0, 1)
`;

room.assert(`wish`, ["text", code], `runs on robot`)



run();
