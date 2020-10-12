from helper2 import init, claim, retract, prehook, subscription, batch, MY_ID_STR, listen, get_my_id_str
import helper2
import serial
import logging
import time
import sys

helper2.rpc_url = "192.168.1.34"

init(__file__, skipListening=True)

with serial.Serial('/dev/ttyACM0', 9600, timeout=0.1) as ser:
    ser.reset_input_buffer()
    ser.reset_output_buffer()
    while True:
        # Receive serial messages
        claims = []
        # logging.info("reading serial lines")
        lines = ser.readlines()  # used the serial timeout specified above
        # logging.info("done reading serial lines.")
        logging.info(lines)
        sent_prefixes = {}
        for line in reversed(lines):
            # Example: line = b'0 Card UID: fjfjefkj\n'
            try:
                if len(line) > 0 and b' Card UID:' in line:
                    parsed_line = line.rstrip().split(b' Card UID: ')
                    if len(parsed_line) is 2:
                        prefix = parsed_line[0].decode("utf-8")
                        value = parsed_line[1].decode("utf-8")
                        if prefix in ['0', '1', '2', '3'] and prefix not in sent_prefixes:
                            claims.append({"type": "retract", "fact": [
                                ["id", get_my_id_str()],
                                ["id", "0"],
                                ["text", "ArduinoUSB"],
                                ["text", "read"],
                                ["variable", ""],
                                ["text", "on"],
                                ["text", "sensor"],
                                ["integer", prefix],
                            ]})
                            claims.append({"type": "claim", "fact": [
                                ["id", get_my_id_str()],
                                ["id", "0"],
                                ["text", "ArduinoUSB"],
                                ["text", "read"],
                                ["text", value],
                                ["text", "on"],
                                ["text", "sensor"],
                                ["integer", prefix],
                            ]})
                            sent_prefixes[prefix] = True
                        else:
                            logging.info("Ignoring message: {}".format(line))
                    else:
                        logging.info("Ignoring message: {}".format(line))
            except:
                logging.error("Unexpected error:", sys.exc_info()[0])
        if len(claims) > 0:
            batch(claims)
        # time.sleep(0.1)
