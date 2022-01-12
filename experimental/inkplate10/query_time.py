import network
import time
from inkplate10 import Inkplate

# From the Inkplate-micropython repo root, run:
# python3 pyboard.py --device /dev/cu.usbserial-1420 app.py

ssid = "TODO"
password = "TODO"

# More info here: https://docs.micropython.org/en/latest/esp8266/tutorial/network_basics.html
def do_connect():
    import network

    sta_if = network.WLAN(network.STA_IF)
    if not sta_if.isconnected():
        print("connecting to network...")
        sta_if.active(True)
        sta_if.connect(ssid, password)
        while not sta_if.isconnected():
            pass
    print("network config:", sta_if.ifconfig())


# More info here: https://docs.micropython.org/en/latest/esp8266/tutorial/network_tcp.html
def http_get(url):
    import socket

    res = ""
    _, _, host, path = url.split("/", 3)
    port = 80
    if ":" in host:
        host, port = host.split(":")
    addr = socket.getaddrinfo(host, port)[0][-1]
    s = socket.socket()
    s.connect(addr)
    s.send(bytes("GET /%s HTTP/1.0\r\nHost: %s\r\n\r\n" % (path, host), "utf8"))
    while True:
        data = s.recv(100)
        if data:
            res += str(data, "utf8")
        else:
            break
    s.close()

    return res


# Calling functions defined above
do_connect()
response = http_get("http://192.168.1.34:3000/select?query=%5B%22%24%20%24%20time%20is%20%24time%22%5D")

# Initialise our Inkplate object
display = Inkplate(Inkplate.INKPLATE_1BIT)
display.begin()

# Print response in lines
cnt = 0
for x in response.split("\n"):
    display.printText(
        10, 10 + cnt, x.upper()
    )  # Default font has only upper case letters
    cnt += 10

# Display image from buffer
display.display()

import re
p = re.compile('.+"integer",.*"(.+)".+')
value = p.match(response)

print(response)
print(value)

if value:
    value = value.group(1)
    display.printText(500, 500, value)
    display.display()