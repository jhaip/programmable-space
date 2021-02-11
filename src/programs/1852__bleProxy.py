from helper import init, subscription, batch, get_my_id_str, listen, subscribe
from bluepy.btle import Scanner, DefaultDelegate, Peripheral, BTLEDisconnectError
from threading import Thread
import time
import json
import threading, queue

ble_activity_lock = threading.Lock()
ble_disconnect_queue = queue.Queue()
connected_ble_devices = {}
callback_map = {}
last_scan_time = time.time()
BLE_SCAN_DELAY = 10
scanner = Scanner()

class MyDelegate(DefaultDelegate):
    def __init__(self, addr, room_batch_queue):
        DefaultDelegate.__init__(self)
        self.msg_cache = b""
        self.addr = addr
        self.room_batch_queue = room_batch_queue

    def handleNotification(self, cHandle, data):
        print("A notification was received: {} ".format(data))
        if data:
            self.msg_cache += data
            if len(self.msg_cache) > 1 and self.msg_cache.decode("utf-8")[-1] == "\n":
                msg = self.msg_cache.decode("utf-8").strip()
                self.msg_cache = b""
                print(msg)
                split_msg = msg.split(":")
                msg_type = split_msg[0]
                if msg_type == "S":
                    # SUB:0568:$ $ value is $x::$ $ $x is open
                    sub_id = split_msg[1]
                    query_strings = [x for x in split_msg[2:] if x != ""]
                    self.room_batch_queue.put(("SUBSCRIBE", sub_id, query_strings))
                elif msg_type == "~":
                    self.room_batch_queue.put(("CLEANUP",))
                elif msg_type == "N":
                    claim_fact_str = split_msg[1]
                    self.room_batch_queue.put(("CLAIM", claim_fact_str))
                else:
                    print("COULD NOT PARSE MESSAGE ({}): {}".format(self.addr, msg))

class BLEDevice(Thread):
    def __init__(self, room_batch_queue, room_sub_update_queue, addr, addrType, ble_activity_lock, death_queue):
        Thread.__init__(self)
        print("Created BLE Device: {}".format(addr))
        self.room_batch_queue = room_batch_queue
        self.room_sub_update_queue = room_sub_update_queue
        self.addr = addr
        self.addrType = addrType
        self.ble_activity_lock = ble_activity_lock
        self.death_queue = death_queue
      
    def ble_listen_loop(self, write_cs, notify_cs):
        print("writing something so connection stays alive")
        write_cs.write(b"hey\n")
        print("listening to read...")
        while True:
            if self.conn.waitForNotifications(1.0):
                continue
            print("waiting...")
            try:
                sub_update_data = self.room_sub_update_queue.get(block=False, timeout=None)
                print("Got sub update for {}".format(self.addr))
                sub_id = sub_update_data[0]
                sub_update_results = sub_update_data[1]
                # [{"a": 5}] -> {"a":5}
                # [{}] -> {}
                # [] -> nothing
                serialized_result = json.dumps(sub_update_results, separators=(',', ':'))[1:-1]
                result_ble_msg = "{}{}\n".format(sub_id, serialized_result)
                print("Sending results: ({}): {}".format(self.addr, result_ble_msg))
                x = result_ble_msg.encode("utf-8")
                chunk_size = 20
                chunks = [x[i:i+chunk_size] for i in range(0, len(x), chunk_size)]
                for chunk in chunks:
                    write_cs.write(chunk)
            except queue.Empty:
                pass
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
            try:
                self.ble_listen_loop(write_cs, notify_cs)
            except BTLEDisconnectError:
                print("Device disconnected {}".format(self.addr))
                self.death_queue.put(self.addr)
        else:
            print("Device {} did not have a write and notify BLE characteristic.".format(self.addr))


def create_ble(addr, addrType):
    global connected_ble_devices, ble_activity_lock
    if addr in connected_ble_devices:
        print("BLE device already connected, ignoring")
        return
    room_batch_queue = queue.Queue()
    room_sub_update_queue = queue.Queue()
    new_ble_device = BLEDevice(room_batch_queue, room_sub_update_queue, addr, addrType, ble_activity_lock, ble_disconnect_queue)
    new_ble_device.setDaemon(True)  # TODO: Is a daemon thread important?
    connected_ble_devices[addr] = (room_batch_queue, room_sub_update_queue, new_ble_device)
    new_ble_device.start()

def hash_query_strings(query_strings):
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

    # TODO: support sending subscriptions to multiple devices
    subscribe(query_strings, callback)

def room_cleanup(addr):
    print("TODO cleanup: {}".format(addr))
    batch([{"type": "retract", "fact": [
        ["id", get_my_id_str()],
        ["id", addr],
        ["postfix", ""]
    ]}])

def room_claim(addr, batch_update_from_ble_device):
    print("TODO claim: {} {}".format(addr, batch_update_from_ble_device))
    batch([{"type": "claim", "fact": [
        ["id", get_my_id_str()],
        ["id", device.addr],
        ["text", str(batch_update_from_ble_device)],
    ]}])

def claim_connected_devices(connected_ble_devices):
    claims = [
        {"type": "retract", "fact": [
            ["id", get_my_id_str()],
            ["id", "0"],
            ["postfix", ""]
        ]}
    ]
    for k in sorted(connected_ble_devices.keys()):
        claims.append({"type": "claim", "fact": [
            ["id", get_my_id_str()],
            ["id", "0"],
            ["text", "connected"],
            ["text", "to"],
            ["text", "device"],
            ["text", str(k)],
        ]})
    batch(claims)

def scan_and_connect(seconds_to_scan=2.0):
    global scanner, connected_ble_devices, last_scan_time
    last_scan_time = time.time()
    print("Scanning for new BLE devices")
    devices = scanner.scan(seconds_to_scan)

    for dev in devices:
        print("Device %s (%s), RSSI=%d dB" % (dev.addr, dev.addrType, dev.rssi))
        if dev.addr not in connected_ble_devices:
            for (adtype, desc, value) in dev.getScanData():
                print("  %s = %s" % (desc, value))
                if desc == "Complete Local Name" and "CIRCUITPY" in value:
                    create_ble(dev.addr, dev.addrType)
                # if dev.addr == "e5:59:80:c5:bc:4d":
                #     create_ble(dev.addr, dev.addrType)
        claim_connected_devices(connected_ble_devices)

# 1. Init connection to room
init(__file__, skipListening=True)
# 2. Cleanup old claims and subscriptions
batch([{"type": "death", "fact": [["id", get_my_id_str()]]}])
# 3. Discover devices
scan_and_connect(seconds_to_scan=2.0)
# 4. Listen for updates from room and BLE devices
while True:
    listen(blocking=False)
    if time.time() - last_scan_time > BLE_SCAN_DELAY:
        scan_and_connect(seconds_to_scan=1.0)
    some_device_died = False
    try:
        while True:
            dead_device_addr = ble_disconnect_queue.get(block=False, timeout=None)
            del connected_ble_devices[dead_device_addr]
            room_cleanup(dead_device_addr)
            # TODO: cleanup device subscriptions as well
            print("Removed {} from connected_ble_devices cache".format(dead_device_addr))
            some_device_died = True
    except queue.Empty:
        pass
    if some_device_died:
        claim_connected_devices(connected_ble_devices)
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
                    room_claim(addr, batch_update_from_ble_device[1])
            except queue.Empty:
                pass
