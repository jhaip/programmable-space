from helper2 import init, claim, retract, prehook, subscription, batch, MY_ID_STR, listen
import pygame
import pygame.midi
import logging
import time

BPM = 60
MELODY = []
MELODY_INDEX = 0
INSTRUMENT = 0

@subscription(["$ $ melody is %melody"])
def melody_callback(results):
    global MELODY, MELODY_INDEX
    try:
        result_melody = results[0]["melody"].replace(" ", "").split(",")
        MELODY = list(map(lambda x: int(x), result_melody))
        MELODY_INDEX = 0
        logging.error("new melody: {}".format(MELODY))
    except:
        MELODY = []
        logging.error("error finding melody in {}".format(results))

@subscription(["$ $ beats per minute is $bpm"])
def bpm_callback(results):
    global BPM
    try:
        BPM = int(results[0]["bpm"])
        logging.error("new bpm: {}".format(BPM))
    except:
        BPM = 60
        logging.error("error finding BPM in {}".format(results))

@subscription(["$ $ instrument is $instrument"])
def instrument_callback(results):
    global INSTRUMENT
    try:
        INSTRUMENT = int(results[0]["instrument"])
        if INSTRUMENT > 127 or INSTRUMENT < 0:
            INSTRUMENT = 0
        logging.error("new instrument: {}".format(INSTRUMENT))
    except:
        INSTRUMENT = 0
        logging.error("error finding instrument in {}".format(results))

def playNextNode(midi_out, instrument, pitch, duration_s):
    midi_out.set_instrument(instrument)
    # 74 is middle C, 127 is "how loud" - max is 127
    midi_out.note_on(pitch, 127)
    time.sleep(duration_s)
    midi_out.note_off(pitch, 127)

init(__file__, skipListening=True)
pygame.init()
pygame.midi.init()
port = pygame.midi.get_default_output_id()
logging.info("using output_id :%s:" % port)
midi_out = pygame.midi.Output(port, 0)
try:
    lastUpdateTime = time.time()
    while True:
        listen(blocking=False)
        if time.time() - lastUpdateTime >= 60.0/BPM and len(MELODY) > 0:
            playNextNode(midi_out, INSTRUMENT, MELODY[MELODY_INDEX], 60.0/BPM)
            MELODY_INDEX = (MELODY_INDEX + 1) % len(MELODY)
        else:
            time.sleep(0.01)
finally:
    midi_out.note_off(MELODY[MELODY_INDEX], 127)
    midi_out.close()
    del midi_out
    pygame.midi.quit()
