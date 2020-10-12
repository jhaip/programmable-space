
const { room, myId, MY_ID_STR, run } = require('../helper2')(__filename);

// var noble = require('noble');   //noble library
var noble = require('@abandonware/noble');

// uuids are easier to read with dashes
// this helper removes dashes so comparisons work
var uuid = function (uuid_with_dashes) {
    return uuid_with_dashes.replace(/-/g, '');
};
var strippedMAC = function (mac) {
    return mac.replace(/-/g, '').replace(/:/g, '');
}

// https://learn.adafruit.com/bluefruit-playground-app/ble-services
const BLUEFRUIT_BUTTON_SERVICE = 'adaf0600c33242a893bd25e905756cb8';
const BLUEFRUIT_LIGHT_SENSOR_SERVICE = 'adaf0300c33242a893bd25e905756cb8';
const BLUEFRUIT_TONE_SERVICE = 'adaf0c00c33242a893bd25e905756cb8';
const BLUEFRUIT_NEOPIXEL_SERVICE = 'adaf0900c33242a893bd25e905756cb8';
const SERVICE_CHARACTERISTICS = {
    [BLUEFRUIT_BUTTON_SERVICE]: ['adaf0601c33242a893bd25e905756cb8'],
    [BLUEFRUIT_LIGHT_SENSOR_SERVICE]: ['adaf0301c33242a893bd25e905756cb8'],
    [BLUEFRUIT_TONE_SERVICE]: ['adaf0c01c33242a893bd25e905756cb8'],
    [BLUEFRUIT_NEOPIXEL_SERVICE]: [
        'adaf0901c33242a893bd25e905756cb8',
        'adaf0902c33242a893bd25e905756cb8',
        'adaf0903c33242a893bd25e905756cb8',
        'adaf0904c33242a893bd25e905756cb8'
    ]
}
const SERVICE_NAMES = {
    [BLUEFRUIT_BUTTON_SERVICE]: 'buttons',
    [BLUEFRUIT_LIGHT_SENSOR_SERVICE]: 'light_sensor',
    [BLUEFRUIT_TONE_SERVICE]: 'tone',
    [BLUEFRUIT_NEOPIXEL_SERVICE]: 'neopixel'
}
const CONVERSION_FUNC = {
    [BLUEFRUIT_BUTTON_SERVICE]: data => data.readUInt8(0),
    [BLUEFRUIT_LIGHT_SENSOR_SERVICE]: data => data.readFloatLE(0)
}

var active_tone_characteristic = null;
var active_neopixel_characteristic = null;
var neopixel_cache = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
]

function update_neopixels(D) {
    if (!active_neopixel_characteristic) {
        console.log("No neopixel characteristic yet")
        return;
    }
    console.log("update neopixels")
    console.log(D)
    // D = [[R,G,B], [R,G,B], ...]
    const msg = [
        0x00, 0x00,
        0x01,
        D[0][1], D[0][0], D[0][2], // Neopixel 0 color in GRB
        D[1][1], D[1][0], D[1][2], // Neopixel 1 color in GRB
        D[2][1], D[2][0], D[2][2], // ...
        D[3][1], D[3][0], D[3][2],
        D[4][1], D[4][0], D[4][2],
        D[5][1], D[5][0], D[5][2],
        D[6][1], D[6][0], D[6][2],
        D[7][1], D[7][0], D[7][2],
        D[8][1], D[8][0], D[8][2],
        D[9][1], D[9][0], D[9][2]
    ]
    active_neopixel_characteristic.write(Buffer.from(msg), true, function (error) {
        console.log('updated neopixels');
        console.log(error);
    });
}

function playTone(freq_hz) {
    if (!active_tone_characteristic) {
        console.log("No tone characteristic yet")
        return;
    }
    const toneFreqByte1 = (freq_hz & 255);
    const toneFreqByte2 = (freq_hz & (255 << 8)) >> 8;
    // Uint16 frequency, reverse byte order. Ex: 0xB1 0x01 = 440
    // Uint32 milliseconds to play, reverse byte order. Ex: 0xFF 0x00 0x00 0x00 = 255
    active_tone_characteristic.write(Buffer.from([toneFreqByte1, toneFreqByte2, 0x00, 0x00, 0x00, 0x00]), true, function (error) {
        console.log(`starting to play ${freq_hz} tone`);
        console.log(error);
    });
}

function stopTone() {
    if (!active_tone_characteristic) {
        console.log("No tone characteristic yet")
        return;
    }
    active_tone_characteristic.write(Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), true, function (error) {
        console.log('cleared tone');
        console.log(error);
    });
}

// when the radio turns on, start scanning:
noble.on('stateChange', function scan(state) {
    if (state === 'poweredOn') {    // if the radio's on, scan for this service
        noble.startScanning([], false);
    }
});

function connect(peripheral) {
    // adaf0600c33242a893bd25e905756cb8 are the bluefruit buttons
    const supportedServices = [BLUEFRUIT_BUTTON_SERVICE, BLUEFRUIT_LIGHT_SENSOR_SERVICE, BLUEFRUIT_TONE_SERVICE, BLUEFRUIT_NEOPIXEL_SERVICE];
    peripheral.discoverServices(supportedServices);
    console.log("started discovering services");
    peripheral.once('servicesDiscover', function (services) {
        services.forEach(service => {
            var serviceUuid = `${service.uuid}`;
            console.log(`discovered ${SERVICE_NAMES[serviceUuid]} service ${service}`);

            service.discoverCharacteristics(SERVICE_CHARACTERISTICS[serviceUuid], function (error, characteristics) {
                console.log(`discovered ${SERVICE_NAMES[serviceUuid]} characteristics`);
                const serviceName = SERVICE_NAMES[serviceUuid];
                if (serviceName === 'tone') {
                    var characteristic = characteristics[0];
                    active_tone_characteristic = characteristic;
                    stopTone();
                } else if (serviceName === 'neopixel') {
                    // var characteristic = characteristics[0];
                    characteristics.forEach(characteristic => {
                        // console.log(characteristic);
                        var characteristicUuid = `${characteristic.uuid}`;
                        if (characteristicUuid === SERVICE_CHARACTERISTICS[BLUEFRUIT_NEOPIXEL_SERVICE][0]) {
                            // set pixel pin to 8
                            characteristic.write(Buffer.from([0x08]), true, function (error) {
                                console.log('wrote neopixel pixel pin service');
                                console.log(error);
                            });
                        }
                        if (characteristicUuid === SERVICE_CHARACTERISTICS[BLUEFRUIT_NEOPIXEL_SERVICE][1]) {
                            // set pixel pin type to 0 = WS2812 (NeoPixel), 800kHz
                            characteristic.write(Buffer.from([0x00]), true, function (error) {
                                console.log('wrote neopixel pixel pin type');
                                console.log(error);
                            });
                        }
                        if (characteristicUuid === SERVICE_CHARACTERISTICS[BLUEFRUIT_NEOPIXEL_SERVICE][2]) {
                            active_neopixel_characteristic = characteristic;
                            update_neopixels(neopixel_cache);
                        }
                        if (characteristicUuid === SERVICE_CHARACTERISTICS[BLUEFRUIT_NEOPIXEL_SERVICE][3]) {
                            // set buffer size to 30
                            characteristic.write(Buffer.from([0x1E, 0x00]), true, function (error) {
                                console.log('wrote neopixel pixel buffer size');
                                console.log(error);
                            });
                        }
                    })
                } else {
                    var characteristic = characteristics[0];

                    characteristic.on('data', function (data, isNotification) {
                        let characteristicValue = CONVERSION_FUNC[serviceUuid](data);
                        console.log(`${SERVICE_NAMES[serviceUuid]} is now: ${characteristicValue}`);

                        if (SERVICE_NAMES[serviceUuid] === 'buttons') {
                            let slideValue = (characteristicValue & 1);
                            let buttonValueA = (characteristicValue & 2) >> 1;
                            let buttonValueB = (characteristicValue & 4) >> 2;
                            room.retractMine(`circuit playground "SLIDE" has value $`);
                            room.assert(`circuit playground "SLIDE" has value ${slideValue}`);
                            room.retractMine(`circuit playground "BUTTON_A" has value $`);
                            room.assert(`circuit playground "BUTTON_A" has value ${buttonValueA}`);
                            room.retractMine(`circuit playground "BUTTON_B" has value $`);
                            room.assert(`circuit playground "BUTTON_B" has value ${buttonValueB}`);
                            room.flush();
                        } else if (SERVICE_NAMES[serviceUuid] === 'light_sensor') {
                            let lightValue = Math.floor(characteristicValue);
                            room.retractMine(`circuit playground "LIGHT" has value $`);
                            room.assert(`circuit playground "LIGHT" has value ${lightValue}`);
                            room.flush();
                        }
                    });

                    // to enable notify
                    characteristic.subscribe(function (error) {
                        console.log(`${SERVICE_NAMES[serviceUuid]} notification on`);
                    });
                }
            });
        });
    });
}

// if you discover a peripheral with the appropriate service, connect:
// noble.on('discover', self.connect);
noble.on('discover', function (peripheral) {
    console.log(`inside discover ${peripheral.address}`)
    if (strippedMAC(peripheral.address) !== strippedMAC('d1:d3:b6:0c:9b:95')) {
        return;
    } else {
        console.log("FOUND BLUEFRUIT!");
        console.log(peripheral);
    }
    
    peripheral.connect();
    peripheral.on('connect', function() {
        noble.stopScanning();
        console.log('connected to peripheral: ' + peripheral.uuid);
        connect(peripheral);
    });
    peripheral.on('disconnect', function () {
        console.log("PERIPHERAL DISCONNECTED")
        setTimeout(() => {
            console.log("attempting to reconnect");
            peripheral.connect();
        }, 1000);
    });
});

room.on(`wish circuit playground neopixel $i had color $r $g $b`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(({ i, r, g, b }) => {
                neopixel_cache[i] = [r, g, b];
                update_neopixels(neopixel_cache);
            });
        }
        room.subscriptionPostfix();
    }
)

room.on(`wish circuit playground played $freq tone`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(({ freq }) => {
                playTone(freq);
            });
        }
        room.subscriptionPostfix();
    }
)

room.on(`wish circuit playground stopped playing tone`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(({ freq }) => {
                stopTone();
            });
        }
        room.subscriptionPostfix();
    }
)

// Run with:
// which node
// sudo the-node-from-above 1193__bluefruitProxy.js

room.cleanup();
room.retractRaw(`subscription #1193 %`);

run();
