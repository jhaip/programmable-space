from helper import init, claim, retract, prehook, subscription, batch, get_my_id_str, check_server_connection
import helper
import keyboard
import time
import logging

helper.rpc_url = "192.168.1.34"

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
    if special_key:
        logging.info("ADDING SPECIAL KEY {}".format(special_key))
        return {"type": "claim", "fact": [
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
        ]}
    else:
        logging.info("ADDING KEY {}".format(key))
        return {"type": "claim", "fact": [
            ["id", get_my_id_str()],
            ["id", "0"],
            ["text", "keyboard"],
            ["text", get_my_id_str()],
            ["text", "typed"],
            ["text", "key"],
            ["text", str(key)],
            ["text", "@"],
            ["integer", str(timestamp)],
        ]}

def handle_key_event(e):
    claims = []
    claims.append({"type": "retract", "fact": [
        ["id", get_my_id_str()],
        ["postfix", ""],
    ]})
    ctrl_held = keyboard.is_pressed('ctrl')
    shift_held = keyboard.is_pressed('shift')
    if e.event_type == 'down':
        if e.name == 'unknown':
            return
        if ctrl_held:
            if shift_held and e.name.isalpha():
                claims.append(add_key(None, 'C-{}'.format(e.name.upper())))
            elif shift_held and e.name in shift_map:
                claims.append(add_key(None, 'C-{}'.format(shift_map[e.name])))
            elif e.name == '−':
                claims.append(add_key(None, 'C--'.format(e.name)))
            else:
                claims.append(add_key(None, 'C-{}'.format(e.name)))
        elif e.name in special_keys:
            claims.append(add_key(None, e.name))
        elif shift_held and e.name.isalpha():
            claims.append(add_key(e.name.upper(), None))
        elif shift_held and e.name in shift_map:
            claims.append(add_key(shift_map[e.name], None))
        elif e.name == '−':
            claims.append(add_key('-', None))
        else:
            claims.append(add_key(e.name, None))
    keys_to_claim_when_pressed = ["up", "right", "down", "left", "space"]
    for key_name in keys_to_claim_when_pressed:
        if keyboard.is_pressed(key_name):
            claims.append({"type": "claim", "fact": [
                ["id", get_my_id_str()],
                ["id", "0"],
                ["text", "keyboard"],
                ["text", get_my_id_str()],
                ["text", "has"],
                ["text", "pressed"],
                ["text", "key"],
                ["text", key_name],
            ]})
    batch(claims)

keyboard.hook(handle_key_event)
keyboard.wait()

