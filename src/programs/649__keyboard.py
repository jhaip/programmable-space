from helper2 import init, claim, retract, prehook, subscription, batch, get_my_id_str, check_server_connection
import keyboard
import time
import logging

init(__file__, skipListening=True)
batch([{"type": "retract", "fact": [["id", get_my_id_str()], ["postfix", ""]]}])

special_keys = ['backspace', 'enter', 'tab', 'space', 'left', 'right', 'up', 'down',
    'shift', 'caps lock', 'alt', 'menu', 'unknown', 'delete', 'page up', 'page down']

shift_map = {
    '.': '>',
    ',': '<',
    '/': '?',
    '[': '{',
    ']': '}',
    '\\': '|',
    '−': '_',
    '`': '~',
    "'": '"',
    ';': ':',
    '=': '+',
    '1': '!',
    '2': '@',
    '3': '#',
    '4': '$',
    '5': '%',
    '6': '^',
    '7': '&',
    '8': '*',
    '9': '(',
    '0': ')'
}

def add_key(key, special_key):
    logging.info("{} - {}".format(key, special_key))
    timestamp = int(time.time()*1000.0)
    claims = []
    claims.append({"type": "retract", "fact": [
        ["id", get_my_id_str()],
        ["postfix", ""],
    ]})
    if special_key:
        logging.info("ADDING SPECIAL KEY {}".format(special_key))
        claims.append({"type": "claim", "fact": [
            ["id", get_my_id_str()],
            ["id", "0"],
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
        logging.info("ADDING KEY {}".format(key))
        claims.append({"type": "claim", "fact": [
            ["id", get_my_id_str()],
            ["id", "0"],
            ["text", "keyboard"],
            ["text", get_my_id_str()],
            ["text", "typed"],
            ["text", "key"],
            ["text", str(key)],
            ["text", "@"],
            ["integer", str(timestamp)],
        ]})
    batch(claims)

def handle_key_event(e):
    ctrl_held = keyboard.is_pressed('ctrl')
    shift_held = keyboard.is_pressed('shift')
    if e.event_type == 'down':
        if e.name == 'unknown':
            return
        if ctrl_held:
            if shift_held and e.name.isalpha():
                add_key(None, 'C-{}'.format(e.name.upper()))
            elif shift_held and e.name in shift_map:
                add_key(None, 'C-{}'.format(shift_map[e.name]))
            elif e.name == '−':
                add_key(None, 'C--'.format(e.name))
            else:
                add_key(None, 'C-{}'.format(e.name))
        elif e.name in special_keys:
            add_key(None, e.name)
        elif shift_held and e.name.isalpha():
            add_key(e.name.upper(), None)
        elif shift_held and e.name in shift_map:
            add_key(shift_map[e.name], None)
        elif e.name == '−':
            add_key('-', None)
        else:
            add_key(e.name, None)

keyboard.hook(handle_key_event)
keyboard.wait()

