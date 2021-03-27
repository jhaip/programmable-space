import board
import usb_hid
from adafruit_hid.keyboard import Keyboard
from adafruit_hid.keyboard_layout_us import KeyboardLayoutUS
from adafruit_hid.keycode import Keycode
from adafruit_hid.gamepad import Gamepad
from digitalio import DigitalInOut, Direction, Pull
import mfrc522

last_value = "FIRST_VALUE_TO_BE_ERASED"
no_value_count = 0
kbd = Keyboard(usb_hid.devices)
layout = KeyboardLayoutUS(kbd)
gp = Gamepad(usb_hid.devices)

switchPins = [board.D10, board.D11, board.D12]
switches = []
switchPressedValues = [] 
for switchPin in switchPins: 
    switch = DigitalInOut(switchPin)
    switch.direction = Direction.INPUT
    switch.pull = Pull.UP
    switches.append(switch)
    switchPressedValues.append(False)

def send_value(val):
    print("sending {}".format(val.lower()))
    # kbd.send(Keycode.CONTROL, Keycode.ONE)
    # layout.write(val.lower())
    # kbd.send(Keycode.CONTROL, Keycode.TWO)
    val = val.lower()
    if len(val) == 8:
        x = int(val[0:2], 16) - 127
        y = int(val[2:4], 16) - 127
        z = int(val[4:6], 16) - 127
        r_z = int(val[6:8], 16) - 127
        gp.move_joysticks(x=x, y=y, z=z, r_z=r_z)
    else:
        gp.move_joysticks(x=0, y=0, z=0, r_z=0)

reader = mfrc522.MFRC522(gpioRst=board.D0, gpioCs=board.D1, cardWaitCount=20)

print("\nPlace card before reader to read from address 0x08\n")

try:
    while True:
        for i, switch in enumerate(switches):
            if not switch.value:
                if not switchPressedValues[i]:
                    switchPressedValues[i] = True
                    print("button {} pressed".format(i + 1))
                    gp.click_buttons(i + 1)
            else:
                switchPressedValues[i] = False

        no_value_count += 1
        if no_value_count > 2:
            no_value_count = 0
            if last_value != "":
                last_value = ""
                send_value(last_value)
        
        (stat, tag_type) = reader.request(reader.REQIDL) 

        if stat == reader.OK:

            (stat, raw_uid) = reader.anticoll()

            if stat == reader.OK:
                new_value = "%02x%02x%02x%02x" % (raw_uid[0], raw_uid[1], raw_uid[2], raw_uid[3])
                # print("Card detected %s" % new_value)
                no_value_count = 0
                if new_value != last_value:
                    last_value = new_value
                    send_value(last_value)
            else:
                print("Authentication error")
except KeyboardInterrupt:
    print("Bye")
