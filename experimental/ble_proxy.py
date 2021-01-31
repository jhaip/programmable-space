# from helper import init, claim, retract, prehook, subscription, subscribe, batch, get_my_id_str
from bluepy.btle import Scanner, DefaultDelegate, Peripheral
import threading
import time

class BLEDevice:
    def __init__(self):
        self.device_name = "TODO"

    def make_ble_sub_callback(ble_device, sub_id):
        def callback(results):
            print(results)
            # Forward results to BLE device
            write_cs.write(results)
        return callback

    def thread_listen(notify_cs, write_cs):
        print("listening to read...")
        while True:
            msg = notify_cs.read()
            if msg:
                print(msg)
                split_msg = msg.split(":")
                msg_type = split_msg[0]
                if msg_type == "SUB":
                    # SUB:0568:$ $ value is $x::$ $ $x is open
                    sub_id = split_msg[1]
                    query_strings = [x for x in split_msg[2:] if x != ""]
                    # Callback should be related to 1. BLE Device 2. BLE SUB ?ID
                    callback = make_ble_sub_callback("TODO BLE DEVICE ID", sub_id)
                    subscribe(query_strings, callback)
                elif msg_type == "CLEANUP":
                    batch({"type": "retract", "fact": [
                        ["id", MY_ID_STR],
                        ["variable", ""],
                        ["text", self.device_name],
                        ["postfix", ""]
                    ]})
                elif msg_type == "CLAIM":
                    claim_fact_str = split_msg[1]
                    batch({"type": "claim", "fact": [
                        ["id", MY_ID_STR],
                        ["id", "0"],
                        ["text", self.device_name],
                        ["text", "says"],
                        ["text", claim_fact_str],
                    ]})
            time.sleep(0.05)

    def thread_connect(addr, addrType):
        print("attempting connect to {}".format(addr))
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
            t = threading.Thread(target=thread_listen, args=(notify_cs, write_cs,))
            t.setDaemon(True)
            t.start()

threads = []

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
            if (desc == "Complete Local Name" and value is not None and "CIRCUITPY" in value) or dev.addr == "e5:59:80:c5:bc:4d":
                print("FOUND CIRCUIT PY!!")
                t = threading.Thread(target=thread_connect, args=(dev.addr, dev.addrType,))
                t.setDaemon(True)
                threads.append(t)
        elif isNewData:
            print("Received new data from", dev.addr)

scanner = Scanner().withDelegate(ScanDelegate())
devices = scanner.scan(2.0)

for t in threads:
    t.start()
    t.join()

time.sleep(10)

init(__file__, skipListening=True)

while True:
    listen(blocked=False)
    time.sleep(0.01)
    # Once in a while, rescan for BLE devices?

# Loops:
# 1. Subscription listen loop
# 2. Poll BLE devices
# 4. Listen for messages from connected BLE devices