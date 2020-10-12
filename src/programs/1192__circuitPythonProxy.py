from helper2 import init, claim, retract, prehook, subscription, batch, MY_ID_STR, listen, get_my_id_str
import helper2
import serial
import logging
import time

# helper2.rpc_url = "10.0.0.27"

write_buffer = []

@subscription(["$ $ wish circuit playground neopixel $i had color $r $g $b"])
def circuit_playground_light_callback(results):
    global write_buffer
    if results:
        for result in results:
            line = b'L' + bytearray([result["i"], result["r"], result["g"], result["b"]]) + b'00'
            write_buffer.append(line)

@subscription(["$ $ wish circuit playground played $freq tone"])
def circuit_playground_play_tone_callback(results):
    global write_buffer
    if results:
        for result in results:
            line = b'T' + result["freq"].to_bytes(2, 'little') + b'0000'
            write_buffer.append(line)
    else:
        write_buffer.append(b'S000000')

@subscription(["$ $ wish circuit playground stopped playing tone"])
def circuit_playground_play_tone_callback(results):
    global write_buffer
    if results:
        for result in results:
            write_buffer.append(b'S000000')


init(__file__, skipListening=True)


with serial.Serial('/dev/ttyUSB0', 9600, timeout=0.1) as ser:
    ser.reset_input_buffer()
    ser.reset_output_buffer()
    while True:
        received_msg = True
        while received_msg:
            logging.info("checking for messages from room")
            received_msg = listen(blocking=False)
        # Send new messages if there are any
        if len(write_buffer) > 0:
            logging.info("writing to serial:")
            logging.info(write_buffer)
            for line in write_buffer:
                ser.write(line)
            write_buffer = []
        # Receive serial messages
        claims = [
            {"type": "retract", "fact": [["id", get_my_id_str()], ["id", "0"], ["postfix", ""]]}
        ]
        logging.info("reading serial lines")
        lines = ser.readlines()  # used the serial timeout specified above
        logging.info("done reading serial lines.")
        logging.info(lines)
        sent_prefixes = {}
        for line in reversed(lines):
            # Example: line = b'BUTTON_A:1\n'
            try:
                parsed_line = line.rstrip().split(b":")
                if len(parsed_line) is 2:
                    prefix = parsed_line[0].decode("utf-8")
                    value = parsed_line[1]
                    if (prefix == 'BUTTON_A' or prefix == 'BUTTON_B' or prefix == 'LIGHT') and (prefix not in sent_prefixes):
                        claims.append({"type": "claim", "fact": [
                            ["id", get_my_id_str()],
                            ["id", "0"],
                            ["text", "circuit"],
                            ["text", "playground"],
                            ["text", prefix],
                            ["text", "has"],
                            ["text", "value"],
                            ["integer", value.decode("utf-8")],
                        ]})
                        sent_prefixes[prefix] = True
                    else:
                        logging.info("Ignoring message: {}".format(line))
            except:
                logging.error("Unexpected error:", sys.exc_info()[0])
        if claims:
            batch(claims)
        time.sleep(0.1)
