import random
import time
from adafruit_ble import BLERadio
from adafruit_ble.advertising.standard import ProvideServicesAdvertisement
from adafruit_ble.services.nordic import UARTService

#--- Simple claim program
#
# while room.connected():
#     print((scale(light.value), thermistor.temperature))
#     room.claim('{},{}'.format(scale(light.value), thermistor.temperature))
#     time.sleep(0.1)

#--- Subscription program
#
# x = 0
#
# def callback(results):
#     if results:
#         x = results[0]["x"]
#
# room.when(["$ $ value is $x"], callback)
#
# while room.connected():
#     print(x)
#     time.sleep(0.1)

class Room:
    def __init__(self, use_debug=False):
        self.use_debug = use_debug
        self.subscription_ids = {}
        self.subscription_messages_on_reconnect = []
        self.ble = BLERadio()
        self.uart_server = UARTService()
        self.advertisement = ProvideServicesAdvertisement(self.uart_server)
        self.chunk_size = 20  # adafruit_ble can only write in 20 byte chunks
        self.recv_msg_cache = ""
    
    def debug(self, msg):
        if self.use_debug:
            print(msg)

    def cleanup(self):
        self.uart_server.write('CLEANUP:\n'.encode("utf-8"))

    def claim(self, claim_str):
        # Cleanup claim = cleanup all previous claims
        self.uart_server.write('CLAIM:{}\n'.format(claim_str).encode("utf-8"))
    
    def when(self, query_strings, callback):
        x = str(random.randint(0, 9999))
        subscription_id = '0'*(4-len(x)) + x  # like 0568
        self.subscription_ids[subscription_id] = callback
        # SUB:0568:$ $ value is $x::$ $ $x is open
        x = 'SUB:{}:{}\n'.format(subscription_id, '::'.join(query_strings)).encode("utf-8")
        self.subscription_messages_on_reconnect.append(x)
    
    def parse_results(self, val):
        self.debug("parsing results: {}".format(val))
        result_vals = val[2:-2].split("},{")
        results = []
        for result_val in result_vals:
            result = {}
            rvs = result_val.split(",")
            for rv in rvs:
                kv = rv.strip().split(":")
                result[kv[0].replace('"', '')] = kv[1]
            results.append(result)
        return results

    def listen_and_update_subscriptions(self):
        while self.uart_server.in_waiting > 0:
            read_msg = self.uart_server.read()
            if read_msg is not None:
                self.recv_msg_cache += read_msg.decode("utf-8")
                self.debug("sub update: {}".format(self.recv_msg_cache))
        if self.recv_msg_cache[-1] == "\n":
            self.recv_msg_cache = ""
            # 1234[{x:"5",y:"1"},{"x":1,"y":2}]
            sub_id = self.recv_msg_cache[:4] # first four characters of message are sub id
            if sub_id not in self.subscription_ids:
                print("Unknown sub id {}".format(sub_id))
                return
            val = self.recv_msg_cache[4:]
            callback = self.subscription_ids[sub_id]
            callback(self.parse_results(val))

    def connected(self):
        if not self.ble.connected:
            # Advertise when not connected.
            print("BLE not connected, advertising...")
            self.ble.start_advertising(self.advertisement)
            while not self.ble.connected:
                pass
            self.ble.stop_advertising()
            print("BLE now connected")
            time.sleep(1.0)  # Give BLE connector time setup before sending data
            for sub_msg in self.subscription_messages_on_reconnect:
                self.debug("Sending sub message: {}".format(sub_msg))
                self.uart_server.write(sub_msg)
        self.listen_and_update_subscriptions()
        return True
