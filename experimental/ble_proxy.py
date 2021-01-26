from bluepy.btle import Scanner, DefaultDelegate, Peripheral
import time

class ScanDelegate(DefaultDelegate):
    def __init__(self):
        DefaultDelegate.__init__(self)

    def handleDiscovery(self, dev, isNewDev, isNewData):
        if isNewDev:
            print("Discovered device", dev.addr)
        elif isNewData:
            print("Received new data from", dev.addr)

scanner = Scanner().withDelegate(ScanDelegate())
devices = scanner.scan(2.0)

foundcpy = None
foundcpy_type = None
for dev in devices:
    print("Device %s (%s), RSSI=%d dB" % (dev.addr, dev.addrType, dev.rssi$
    for (adtype, desc, value) in dev.getScanData():
        print("  %s = %s" % (desc, value))
        if desc == "Complete Local Name" and "CIRCUITPY" in value:
            foundcpy = dev.addr
            foundcpy_type = dev.addrType

print("Found py?")
print(foundcpy)

if foundcpy:
    dev = Peripheral(foundcpy, addrType=foundcpy_type)
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
