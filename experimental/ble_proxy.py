# from helper import init, claim, retract, prehook, subscription, batch, get_my_id_str
from bluepy.btle import Scanner, DefaultDelegate, Peripheral
import time
import threading, queue
from threading import Thread

ble_activity_lock = threading.Lock()
connected_ble_devices = {}
callback_map = {}

class MyDelegate(DefaultDelegate):
    def __init__(self, addr, room_batch_queue):
        DefaultDelegate.__init__(self)
        self.msg_cache = b""
        self.addr = addr
        self.room_batch_queue = room_batch_queue

    def handleNotification(self, cHandle, data):
        #     if (cHandle == temperature_handle):
        #         # temp = binascii.b2a_hex(data)
        #         temp = ord(data)
        #         # temp2 = int(data.encode('hex'), 8)
        #         print("A notification was received: %s ", temp)
        #     else:
        print("A notification was received: {} ".format(data))
        if data:
            self.msg_cache += data
            if len(self.msg_cache) > 1 and self.msg_cache.decode("utf-8")[-1] == "\n":
                msg = self.msg_cache.decode("utf-8").strip()
                self.msg_cache = b""
                print(msg)
                split_msg = msg.split(":")
                msg_type = split_msg[0]
                if msg_type == "SUB":
                    # SUB:0568:$ $ value is $x::$ $ $x is open
                    sub_id = split_msg[1]
                    query_strings = [x for x in split_msg[2:] if x != ""]
                    self.room_batch_queue.put(("SUBSCRIBE", sub_id, query_strings))
                elif msg_type == "CLEANUP":
                    self.room_batch_queue.put(("CLEANUP",))
                elif msg_type == "CLAIM":
                    claim_fact_str = split_msg[1]
                    self.room_batch_queue.put(("CLAIM", claim_fact_str))
                else:
                    print("COULD NOT PARSE MESSAGE ({}): {}".format(self.addr, msg))

class BLEDevice(Thread):
    def __init__(self, room_batch_queue, room_sub_update_queue, addr, addrType, ble_activity_lock):
        Thread.__init__(self)
        print("Created BLE Device: {}".format(addr))
        self.room_batch_queue = room_batch_queue
        self.room_sub_update_queue = room_sub_update_queue
        self.addr = addr
        self.addrType = addrType
        self.ble_activity_lock = ble_activity_lock
      
    def ble_listen_loop(self, write_cs, notify_cs):
        print("writing something so connection stays alive")
        write_cs.write(b"hey")
        print("listening to read...")
        while True:
            if self.conn.waitForNotifications(1.0):
                continue
            print("waiting...")
            # TODO: Listen for self.room_sub_update_queue updates
            time.sleep(0.05)

    def run(self):
        print("attempting connect to {}".format(self.addr))
        self.ble_activity_lock.acquire()
        self.conn = Peripheral(self.addr, self.addrType)
        self.ble_activity_lock.release()
        print("Connected! {}".format(self.addr))
        css = self.conn.getCharacteristics()
        notify_cs = None
        write_cs = None
        for cs in css:
            print(cs.uuid, cs.propertiesToString())
            # per.getCharacteristics(uuid='6e400003-b5a3-f393-e0a9-e50e24dcca9e')[0]
            if cs.propertiesToString() == "NOTIFY ":
                notify_cs = cs
            if "WRITE" in cs.propertiesToString():
                write_cs = cs
        if write_cs and notify_cs:
            self.conn.setDelegate(MyDelegate(self.addr, self.room_batch_queue))

            # enable notification
            setup_data = b"\x01\x00"
            notify_handle = notify_cs.getHandle() + 1
            self.conn.writeCharacteristic(notify_handle, setup_data, withResponse=True)
            self.ble_listen_loop(write_cs, notify_cs)
        else:
            print("Device {} did not have a write and notify BLE characteristic.".format(self.addr))


def create_ble(addr, addrType):
    global connected_ble_devices, ble_activity_lock
    room_batch_queue = queue.Queue()
    room_sub_update_queue = queue.Queue()
    new_ble_device = BLEDevice(room_batch_queue, room_sub_update_queue, addr, addrType, ble_activity_lock)
    new_ble_device.setDaemon(True)  # TODO: Is a daemon thread important?
    connected_ble_devices[addr] = (room_batch_queue, room_sub_update_queue, new_ble_device)
    new_ble_device.start()

def hash_query_strings(query_strings)
    return str(query_strings)

def make_ble_callback(query_strings, addr, sub_id, room_sub_update_queue):
    global callback_map
    print("BLE CALLBACK ADDED: {} {} {}".format(addr, sub_id, query_strings))
    qs_hash = hash_query_strings(query_strings)
    if qs_hash not in callback_map:
        callback_map[qs_hash] = []
    callback_map[qs_hash].append((addr, sub_id, room_sub_update_queue))

    def callback(results):
        global callback_map
        # Given callback's query_string:
        for addr, sub_id, room_sub_update_queue in callback_map[qs_hash]:
            room_sub_update_queue.put((sub_id, results))

    # subscribe(query_strings, callback)

def room_cleanup(addr):
    print("TODO cleanup: {}".format(addr))
    # batch({"type": "retract", "fact": [
    #     ["id", get_my_id_str()],
    #     ["id", addr],
    #     ["postfix", ""]
    # ]})

def room_claim(addr, batch_update_from_ble_device):
    print("TODO claim: {} {}".format(addr, batch_update_from_ble_device))
    # batch({"type": "claim", "fact": [
    #     ["id", get_my_id_str()],
    #     ["id", device.addr],
    #     ["text", batch_update_from_ble_device],
    # ]})


# 1. Discover devices
scanner = Scanner()
devices = scanner.scan(2.0)

# 2. Connect to them
for dev in devices:
    print("Device %s (%s), RSSI=%d dB" % (dev.addr, dev.addrType, dev.rssi))
    for (adtype, desc, value) in dev.getScanData():
        print("  %s = %s" % (desc, value))
        if dev.addr not in connected_ble_devices:
            if desc == "Complete Local Name" and "CIRCUITPY" in value:
                create_ble(dev.addr, dev.addrType)
            # if dev.addr == "e5:59:80:c5:bc:4d":
            #     create_ble(dev.addr, dev.addrType)

# 3. Init connection to room
# init(__file__, skipListening=True)

# 4. Listen for updates from room and BLE devices
while True:
    # listen(blocking=False)
    for addr, data in list(connected_ble_devices.items()):
        room_batch_queue, room_sub_update_queue, device = data
        if not device.is_alive():
            print("Device died: {}".format(addr))
            del connected_ble_devices[addr]
        else:
            try:
                batch_update_from_ble_device = room_batch_queue.get(block=False, timeout=None)
                update_type = batch_update_from_ble_device[0]
                if update_type == "SUBSCRIBE":
                    sub_id = batch_update_from_ble_device[1]
                    sub_query_strings = batch_update_from_ble_device[2]
                    make_ble_callback(sub_query_strings, addr, sub_id, room_sub_update_queue)
                elif update_type == "CLEANUP":
                    room_cleanup(addr)
                elif update_type == "CLAIM":
                    room_claim(addr, batch_update_from_ble_device)
            except queue.Empty:
                pass
