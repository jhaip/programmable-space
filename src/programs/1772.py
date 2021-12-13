import time
from adafruit_clue import clue
from progspace_room import Room

room = Room(use_debug=True)
clue_display = clue.simple_text_display(text_scale=6)
clue_display[0].text = "Init"
clue_display.show()
last_value = 0

def update_activity(new_activity):
    global clue_display, last_value
    if last_value != new_activity:
        last_value = new_activity
        clue_display[0].text = new_activity
        clue_display.show()
        room.cleanup()
        room.claim('activity is {}'.format(new_activity))

while True:
    while room.connected():
        if clue.button_a:
            update_activity("work")
        if clue.button_b:
            update_activity("play")
