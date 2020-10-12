from helper2 import init, subscription, batch, MY_ID_STR, check_server_connection, get_my_id_str
import helper2
import logging
import sys
import time
import RPi.GPIO as GPIO
from subprocess import call

PIN_PROJ_ON_EXT = 26
PIN_HOST_PRESENTZ = 25
GPIO.setmode(GPIO.BCM)
GPIO.setup([PIN_HOST_PRESENTZ, PIN_PROJ_ON_EXT], GPIO.OUT)

def turn_off():
    logging.info("turning lightcrafter off")
    GPIO.output(PIN_HOST_PRESENTZ, GPIO.LOW)
    GPIO.output(PIN_PROJ_ON_EXT, GPIO.LOW)

def turn_on():
    logging.info("turning lightcrafter on")
    GPIO.output(PIN_HOST_PRESENTZ, GPIO.LOW)
    GPIO.output(PIN_PROJ_ON_EXT, GPIO.HIGH)
    GPIO.output(PIN_HOST_PRESENTZ, GPIO.HIGH)
    time.sleep(0.5)
    call('sudo i2cset -y 11 0x1b 0x0c 0x00 0x00 0x00 0x13 i', shell=True)
    call('sudo i2cset -y 11 0x1b 0x0b 0x00 0x00 0x00 0x00 i', shell=True)

@subscription(["$ $ wish lightcrafter was $state"])
def sub_callback(results):
    if results:
        state = results[0]["state"]
        if state == "on":
            turn_on()
        elif state == "off":
            turn_off()

init(__file__)
