import usb_hid
from adafruit_hid.keyboard import Keyboard
from adafruit_hid.keyboard_layout_us import KeyboardLayoutUS
from adafruit_hid.keycode import Keycode
from mfrc522 import MFRC522

last_value = "FIRST_VALUE_TO_BE_ERASED"
no_value_count = 0

kbd = Keyboard(usb_hid.devices)
layout = KeyboardLayoutUS(kbd)

def uidToString(uid):
    mystring = ""
    for i in reversed(uid):
        mystring = "%02X" % i + mystring
    return mystring

def send_value(val):
    print("TODO: send {}".format(val))
    kbd.send(Keycode.CONTROL, Keycode.ONE)
    layout.write(val)
    kbd.send(Keycode.CONTROL, Keycode.TWO)

reader = MFRC522()

print("")
print("Place card before reader to read from address 0x08")
print("")

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
    
            (stat, uid) = reader.SelectTagSN()
        
            if stat == reader.OK:
                new_value = uidToString(uid)
                print("Card detected %s" % new_value)
                no_value_count = 0
                if new_value != last_value:
                    last_value = new_value
                    send_value(last_value)
            else:
                print("Authentication error")

except KeyboardInterrupt:
    print("Bye")
