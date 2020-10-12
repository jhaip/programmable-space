from helper2 import init, claim, retract, prehook, subscription, batch, get_my_id_str
import logging
import busio
import serial
import adafruit_thermal_printer

ThermalPrinter = adafruit_thermal_printer.get_printer_class(2.64)
uart = serial.Serial("/dev/ttyUSB1", 19200, timeout=5)
printer = ThermalPrinter(uart)
printer.send_command("\x1B\x21\x01") # Use small font B

@subscription(["$ $ wish text $text would be thermal printed"])
def sub_callback(results):
    claims = []
    claims.append({"type": "retract", "fact": [
        ["variable", ""],
        ["variable", ""],
        ["text", "wish"],
        ["text", "text"],
        ["variable", ""],
        ["text", "would"],
        ["text", "be"],
        ["text", "thermal"],
        ["text", "printed"],
    ]})
    batch(claims)
    for result in results:
        logging.info("PRINTING:")
        logging.info(result["text"].replace(chr(9787), '"'))
        printer.print(result["text"].replace(chr(9787), '"'))
        printer.feed(2)

init(__file__)
