import time
import board
import neopixel
import busio
import digitalio
uart = busio.UART(board.TX, board.RX, baudrate=9600, timeout=0.1)
from adafruit_circuitplayground import cp

N_PIXELS = 10
last_sensor_reading = time.monotonic()
STATE = "IDLE"
buffer = []

while True:
    # Read commands to change outputs
    data = uart.read(1)
    while data is not None:
        print(data)
        if STATE == "IDLE" and bytearray([data[0]]) in [b'L', b'T', b'S']:
            STATE = "ACTIVE"
            buffer.append(data[0])
        elif STATE == "ACTIVE":
            buffer.append(data[0])
            if len(buffer) == 7:
                print("GOT FULL MESSAGE")
                print(buffer)
                # buffer is full, process message
                prefix = bytearray([buffer[0]])
                if prefix == b'L':
                    print("PARSING LIGHT COMMAND")
                    pixel_id = int(buffer[1])
                    if pixel_id >= 0 and pixel_id < N_PIXELS:
                        r = int(buffer[2])
                        g = int(buffer[3])
                        b = int(buffer[4])
                        cp.pixels[pixel_id] = (r, g, b)
                elif prefix == b'T':
                    print("PARSING TONE COMMAND")
                    cp.start_tone(int.from_bytes(bytearray([buffer[1], buffer[2]]), 'little'))
                elif prefix == b'S':
                    print("PARSING STOP_TONE COMMAND")
                    cp.stop_tone()
                # done processing message
                buffer = []
                STATE = "IDLE"
        else:
            print("IGNORING BYTE")
        data = uart.read(1)
    
    print("done reading data")

    # Write sensor values
    if time.monotonic() - last_sensor_reading > 0.1:
        last_sensor_reading = time.monotonic()
        button_a_value = 1 if cp.button_a else 0
        button_b_value = 1 if cp.button_b else 0
        light_value = cp.light
        print("SENDING SENSOR VALUES: {} {} {}".format(button_a_value, button_b_value, light_value))
        uart.write(b"BUTTON_A:{}\n".format(button_a_value).encode())
        uart.write(b"BUTTON_B:{}\n".format(button_b_value).encode())
        uart.write(b"LIGHT:{}\n".format(light_value).encode())

    # time.sleep(0.1)
