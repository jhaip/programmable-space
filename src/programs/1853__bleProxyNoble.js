
const { room, myId, MY_ID_STR, run } = require('../helpers/helper')(__filename);
const noble = require('@abandonware/noble');

var connectedCandidates = [];
var connectedDevices = {};
// serialized query strings -> array of (device ID, device Subscription ID)
var deviceSubscriptions = {};

const hashQueryStrings = queryStrings => `${queryStrings}`;
const uuid = uuid_with_dashes => uuid_with_dashes.replace(/-/g, '');
const strippedMAC = mac => mac.replace(/-/g, '').replace(/:/g, '');
// circuit python: d1:d3:b6:0c:9b:95
// Argon: e5:59:80:c5:bc:4d
const shouldConnectToDevice = peripheral => 
  (peripheral.advertisement && peripheral.advertisement.localName && peripheral.advertisement.localName.includes("CIRCUITPY")) ||
  strippedMAC(peripheral.address) === strippedMAC('e5:59:80:c5:bc:4dx');

// when the radio turns on, start scanning:
noble.on('stateChange', state => {
  if (state === 'poweredOn') {
    noble.startScanning([], true);
  }
});

noble.on('discover', peripheral => {
  // console.log(`inside discover ${peripheral.address} ${peripheral.advertisement && peripheral.advertisement.localName}`)
  if (shouldConnectToDevice(peripheral) && !connectedCandidates.includes(peripheral.id)) {
    peripheral.connect(error => {
      if (error) {
        console.log(error);
        return;
      }
      console.log('connected to peripheral: ' + peripheral.id);
      connectedCandidates.push(peripheral.id);
      // connecting to a device stops scanning, so restart scanning (https://github.com/noble/noble/issues/358)
      noble.startScanning([], true);
    });
    peripheral.once('connect', () => connect(peripheral));
    peripheral.once('disconnect', () => {
      console.log(`PERIPHERAL DISCONNECTED ${peripheral.id}`)
      delete connectedDevices[peripheral.id];
      connectedCandidates = connectedCandidates.filter(id => id !== peripheral.id);
      room.retractRaw(...[["id", MY_ID_STR], ["id", peripheral.id], ["postfix", ""]]);
      // TODO: cleanup subscriptions
    });
  }
});

function connect(peripheral) {
  peripheral.once('servicesDiscover', function (services) {
    services.forEach(service => {
        // console.log(`discovered service ${service}`);
        service.once('characteristicsDiscover', characteristics => {
          let readCharacteristic, writeCharacteristic;
          characteristics.forEach(characteristic => {
            if (characteristic.properties) {
              if (characteristic.properties.includes('notify')) {
                readCharacteristic = characteristic;
              }
              if (characteristic.properties.includes('write')) {
                writeCharacteristic = characteristic;
              }
            }
          });
          if (readCharacteristic && writeCharacteristic) {
            console.log(`DEVICE IS READY FOR UART! ${peripheral.id}`)
            connectedDevices[peripheral.id] = new BLEDevice(peripheral.id, writeCharacteristic, readCharacteristic, addDeviceSubscription);
          }
        });
        service.discoverCharacteristics();
      });
  });
  console.log("started discovering services");
  peripheral.discoverServices();
}

class BLEDevice {
  constructor(addr, writeCharacteristic, readCharacteristic, addDeviceSubscription) {
    this.addr = addr;
    this.writeCharacteristic = writeCharacteristic;
    this.readCharacteristic = readCharacteristic;
    this.addDeviceSubscription = addDeviceSubscription;
    this.msgCache = "";

    this.readCharacteristic.on('data', (data, isNotification) => this.onRecvData(data));
    // Enable notify:
    this.readCharacteristic.subscribe(error => console.log(`notification on`));
  }
  onRecvData(data) {
    const val = new Buffer.from(data).toString();
    this.msgCache += val;
    if (this.msgCache.length > 0 && this.msgCache[this.msgCache.length - 1] === "\n") {
      const msg = this.msgCache.slice().trim(); // make a copy
      this.msgCache = "";
      const split_msg = msg.split(":");
      const msg_type = split_msg[0];
      if (msg_type === "S") {
        // S:0568:$ $ value is $x::$ $ $x is open
        const subscriptionId = split_msg[1];
        const queryStrings = split_msg.slice(2).filter(x => x !== "");
        // self.room_batch_queue.put(("SUBSCRIBE", subscriptionId, queryStrings))
        this.addDeviceSubscription(this.addr, subscriptionId, queryStrings);
        console.log(`(${this.addr}): subscribe ${subscriptionId} ${queryStrings}`);
      } else if (msg_type === "~") {
        room.retractRaw(...[["id", MY_ID_STR], ["id", this.addr], ["postfix", ""]])
        room.flush();
        console.log(`(${this.addr}): cleanup`);
      } else if (msg_type === "N") {
        const claim_fact_str = split_msg[1];
        room.assertRaw([["id", MY_ID_STR], ["id", this.addr], ["text", claim_fact_str]])
        room.flush();
        console.log(`(${this.addr}): claim ${claim_fact_str}`);
      } else {
        console.log(`(${this.addr}) COULD NOT PARSE MESSAGE ${msg}`);
        room.retractRaw(...[["id", MY_ID_STR], ["id", this.addr], ["postfix", ""]]);
        room.assertRaw([["id", MY_ID_STR], ["id", this.addr], ["text", "?"], ["text", `${msg}`]]);
        room.flush();
      }
    }
  }
  onSubscriptionUpdate(deviceSubscriptionId, results) {
    console.log(`(${this.addr}) Subscription Update ${deviceSubscriptionId} ${results}`);
    const serialized_result = JSON.stringify(results).slice(1, -1);
    const result_ble_msg = `${deviceSubscriptionId}${serialized_result}\n`;
    console.log(`(${this.addr}) Subscription Update, sending: ${result_ble_msg}`);
    const msgBytes = Buffer.from(result_ble_msg, 'utf-8');
    const chunkSize = 20;
    for (let i = 0; i < Math.ceil(msgBytes.length/chunkSize); i += 1) {
      const chunk = msgBytes.slice(i*chunkSize, (i+1)*chunkSize);
      const withoutResponse = true;
      this.writeCharacteristic.write(chunk, withoutResponse, error => {
        if (error) {
          console.log(`(${this.addr}) Error writing: ${error}`);
        }
      });
    }
  }
}

function addDeviceSubscription(deviceId, deviceSubscriptionId, queryStrings) {
  const key = hashQueryStrings(queryStrings);
  let newSub = false;
  if (!(key in deviceSubscriptions)) {
    deviceSubscriptions[key] = [];
    newSub = true;
  }
  deviceSubscriptions[key].push([deviceId, deviceSubscriptionId])
  if (newSub) {
    console.log(`NEW SUB ${deviceId} ${deviceSubscriptionId} #${queryStrings}#`);
    room.onRaw(...queryStrings, results => {
      deviceSubscriptions[key].forEach(d => {
        const [ deviceId, deviceSubscriptionId ] = d;
        console.log(results);
        try {
          connectedDevices[deviceId].onSubscriptionUpdate(deviceSubscriptionId, results);
        } catch (error) {
          console.log(`Error updating subscription ${deviceId} ${deviceSubscriptionId} : ${error}`);
        }
      });
    });
  }
}

room.cleanupOtherSource(MY_ID_STR);
run();