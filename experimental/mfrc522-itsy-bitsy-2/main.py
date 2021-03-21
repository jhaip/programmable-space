import board
import usb_hid
from adafruit_hid.keyboard import Keyboard
from adafruit_hid.keyboard_layout_us import KeyboardLayoutUS
from adafruit_hid.keycode import Keycode
import mfrc522

last_value = "FIRST_VALUE_TO_BE_ERASED"
no_value_count = 0
kbd = Keyboard(usb_hid.devices)
layout = KeyboardLayoutUS(kbd)

def send_value(val):
    print("sending {}".format(val.lower()))
    kbd.send(Keycode.CONTROL, Keycode.ONE)
    layout.write(val.lower())
    kbd.send(Keycode.CONTROL, Keycode.TWO)

reader = mfrc522.MFRC522(gpioRst=board.D0, gpioCs=board.D1)

print("\nPlace card before reader to read from address 0x08\n")

try:
    while True:
        # print("loop")
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
                print("Card detected %s" % new_value)
                no_value_count = 0
                if new_value != last_value:
                    last_value = new_value
                    send_value(last_value)
            else:
                print("Authentication error")
except KeyboardInterrupt:
    print("Bye")
