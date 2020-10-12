import time
import logging
from pynput import keyboard
from helper2 import init, claim, retract, prehook, subscription, batch, get_my_id_str
init(__file__, skipListening=True)

is_ctrl_pressed = False

batch([{"type": "retract", "fact": [["id", get_my_id_str()], ["postfix", ""]]}])

def map_special_key(key):
    m = {}
    m[keyboard.Key.backspace] = "backspace"
    m[keyboard.Key.enter] = "enter"
    m[keyboard.Key.tab] = "tab"
    m[keyboard.Key.space] = "space"
    m[keyboard.Key.left] = "left"
    m[keyboard.Key.right] = "right"
    m[keyboard.Key.up] = "up"
    m[keyboard.Key.down] = "down"
    m["C-p"] = "C-p"
    m["C-s"] = "C-s"
    m["doublequote"] = "doublequote"
    if key in m:
        return m[key]
    return None


def add_key(key, special_key):
    timestamp = int(time.time()*1000.0)
    claims = []
    claims.append({"type": "retract", "fact": [
        ["id", get_my_id_str()],
        ["postfix", ""],
    ]})
    if special_key:
        special_key = map_special_key(special_key)
        logging.info("ADDING SPECIAL KEY {} -- {}".format(str(special_key), special_key))
        # say("keyboard {} typed special key \"{}\" @ {}".format(MY_ID, special_key, timestamp))
        claims.append({"type": "claim", "fact": [
            ["id", get_my_id_str()],
            ["text", "keyboard"],
            ["text", get_my_id_str()],
            ["text", "typed"],
            ["text", "special"],
            ["text", "key"],
            ["text", str(special_key)],
            ["text", "@"],
            ["integer", str(timestamp)],
        ]})
    else:
        logging.info("ADDING KEY {} -- {}".format(str(key), key))
        # say("keyboard {} typed key \"{}\" @ {}".format(MY_ID, key, timestamp))
        claims.append({"type": "claim", "fact": [
            ["id", get_my_id_str()],
            ["text", "keyboard"],
            ["text", get_my_id_str()],
            ["text", "typed"],
            ["text", "key"],
            ["text", str(key)],
            ["text", "@"],
            ["integer", str(timestamp)],
        ]})
    batch(claims)

def add_ctrl_key_combo(key):
    add_key(None, "C-{0}".format(key))


def on_press(key):
    global is_ctrl_pressed
    try:
        logging.info('alphanumeric key {0} pressed'.format(
            key.char))
        if is_ctrl_pressed:
            add_ctrl_key_combo(key.char)
        elif key.char == chr(34):
            add_key(None, "doublequote")
        else:
            add_key(key.char, None)
    except AttributeError:
        logging.info('special key {0} pressed'.format(
            key))
        add_key(None, key)
        if key == keyboard.Key.ctrl:
            is_ctrl_pressed = True

def on_release(key):
    global is_ctrl_pressed
    logging.info('{0} released'.format(
        key))
    if key == keyboard.Key.ctrl:
        is_ctrl_pressed = False
    if key == keyboard.Key.esc:
        # Stop listener
        return False

# Collect events until released
with keyboard.Listener(
        on_press=on_press,
        on_release=on_release) as listener:
    listener.join()
