
// const { room, myId, MY_ID_STR, run } = require('../helpers/helper')(__filename);

// var noble = require('noble');   //noble library
var noble = require('@abandonware/noble');

var connectedDevices = [];

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
  if (shouldConnectToDevice(peripheral) && !connectedDevices.includes(peripheral.id)) {
    peripheral.connect(error => {
      if (error) {
        console.log(error);
        return;
      }
      console.log('connected to peripheral: ' + peripheral.id);
      connectedDevices.push(peripheral.id);
      // connecting to a device stops scanning, so restart scanning (https://github.com/noble/noble/issues/358)
      noble.startScanning([], true);
    });
    peripheral.once('connect', () => connect(peripheral));
    peripheral.once('disconnect', () => {
      console.log(`PERIPHERAL DISCONNECTED ${peripheral.id}`)
      connectedDevices = connectedDevices.filter(id => id !== peripheral.id);
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

            let device = new BLEDevice(peripheral.id, writeCharacteristic, readCharacteristic);
            // TODO: add device to connectedDevices map

            
          }
        });
        service.discoverCharacteristics();
      });
  });
  console.log("started discovering services");
  peripheral.discoverServices();
}

class BLEDevice {
  constructor(addr, writeCharacteristic, readCharacteristic) {
    this.addr = addr;
    this.writeCharacteristic = writeCharacteristic;
    this.readCharacteristic = readCharacteristic;
    this.msgCache = "";

    this.readCharacteristic.on('data', this.onRecvData);
    // Enable notify:
    this.readCharacteristic.subscribe(error => console.log(`notification on`));
  }
  onRecvData(data, isNotification) {
    const val = new Buffer.from(data).toString();
    this.msgCache += val;
    if (this.msgCache.length > 0 && self.msgCache[self.msgCache.length - 1] === "\n") {
      const msg = this.msgCache.slice(); // make a copy
      this.msgCache = "";
      const split_msg = msg.split(":");
      const msg_type = split_msg[0];
      if (msg_type === "S") {
        // S:0568:$ $ value is $x::$ $ $x is open
        const subscriptionId = split_msg[1];
        const queryStrings = split_msg.slice(2).filter(x => x !== "");
        // self.room_batch_queue.put(("SUBSCRIBE", subscriptionId, queryStrings))
        console.log(`(${this.addr}): subscribe ${subscriptionId} ${queryStrings}`);
      } else if (msg_type === "~") {
        // self.room_batch_queue.put(("CLEANUP",))
        console.log(`(${this.addr}): cleanup`);
      } else if (msg_type === "N") {
        const claim_fact_str = split_msg[1];
        // self.room_batch_queue.put(("CLAIM", claim_fact_str))
        console.log(`(${this.addr}): claim ${claim_fact_str}`);
      } else {
        console.log(`(${this.addr}) COULD NOT PARSE MESSAGE ${msg}`);
      }
    }
  }
}

// room.cleanup();

// run();