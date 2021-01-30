# from helper import init, claim, retract, prehook, subscription, batch, get_my_id_str
from bluepy.btle import Scanner, DefaultDelegate, Peripheral
import time

def connect(addr, addrType):
    dev = Peripheral(addr, addrType)
    print("Connected!")
    # print(dev.getServices())
    css = dev.getCharacteristics()
    print(css)
    # print(dev.getDescriptors())
    notify_cs = None
    write_cs = None
    for cs in css:
        print(cs.uuid, cs.propertiesToString())
        if cs.propertiesToString() == "NOTIFY ":
            notify_cs = cs
        if "WRITE" in cs.propertiesToString():
            write_cs = cs
    if write_cs:
        print("writing something so connection stays alive")
        write_cs.write(b"hey")
    if notify_cs:
        print("listening to read...")
        while True:
            print(notify_cs.read())
            time.sleep(0.05)

class ScanDelegate(DefaultDelegate):
    def __init__(self):
        DefaultDelegate.__init__(self)

    def handleDiscovery(self, dev, isNewDev, isNewData):
        if isNewDev:
            print("Discovered device", dev.addr)
            desc = dev.getDescription(9)
            print(desc)
            value = dev.getValueText(9)
            print(value)
            if desc == "Complete Local Name" and value is not None and "CIRCUITPY" in value:
                print("FOUND CIRCUIT PY!!")
                connect(dev.addr, dev.addrType)
        elif isNewData:
            print("Received new data from", dev.addr)

scanner = Scanner().withDelegate(ScanDelegate())
devices = scanner.scan(2.0)

# init(__file__)

# Loops:
# 1. Subscription listen loop
# 2. Poll BLE devices
# 4. Listen for messages from connected BLE devices