#include "Particle.h"
/*
 * MFRC522 - Library to use ARDUINO RFID MODULE KIT 13.56 MHZ WITH TAGS SPI W AND R BY COOQROBOT.
 * The library file MFRC522.h has a wealth of useful info. Please read it.
 * The functions are documented in MFRC522.cpp.
 *
 * Based on code Dr.Leong   ( WWW.B2CQSHOP.COM )
 * Created by Miguel Balboa (circuitito.com), Jan, 2012.
 * Rewritten by Søren Thing Andersen (access.thing.dk), fall of 2013 (Translation to English, refactored, comments, anti collision, cascade levels.)
 * Released into the public domain.
 *
 * Sample program showing how to read data from a PICC using a MFRC522 reader on the Arduino SPI interface.
 *----------------------------------------------------------------------------- empty_skull
 * Aggiunti pin per arduino Mega
 * add pin configuration for arduino mega
 * http://mac86project.altervista.org/
 ----------------------------------------------------------------------------- Nicola Coppola
 * Pin layout should be as follows:
 * Signal     Pin              Pin               Pin			Pin
 *            Arduino Uno      Arduino Mega      SPARK			MFRC522 board
 * ---------------------------------------------------------------------------
 * Reset      9                5                 ANY (D2)		RST
 * SPI SS     10               53                ANY (A2)		SDA
 * SPI MOSI   11               51                A5				MOSI
 * SPI MISO   12               50                A4				MISO
 * SPI SCK    13               52                A3				SCK
 *
 * The reader can be found on eBay for around 5 dollars. Search for "mf-rc522" on ebay.com.
 */

//#include <SPI.h>
#include "MFRC522.h"

#define RST_PIN D2

#define SS_PIN D1
#define SS_PIN_B D0
#define SS_PIN_C D3
#define SS_PIN_D D4
#define SS_PIN_E D5

// Create MFRC522 instances
MFRC522 mfrc522(SS_PIN, RST_PIN);
// MFRC522 mfrc522_b(SS_PIN_B, RST_PIN);
MFRC522 mfrc522_c(SS_PIN_C, RST_PIN);
MFRC522 mfrc522_d(SS_PIN_D, RST_PIN);
MFRC522 mfrc522_e(SS_PIN_E, RST_PIN);
// MFRC522 mfrc522_f(SS_PIN_F, RST_PIN);

// This example does not require the cloud so you can run it in manual mode or
// normal cloud-connected mode
SYSTEM_MODE(MANUAL);

String myID = System.deviceID();

unsigned long lastTime = 0;
unsigned long now = 0;

const size_t UART_TX_BUF_SIZE = 20;

void onDataReceived(const uint8_t *data, size_t len, const BlePeerDevice &peer, void *context);

// These UUIDs were defined by Nordic Semiconductor and are now the defacto standard for
// UART-like services over BLE. Many apps support the UUIDs now, like the Adafruit Bluefruit app.
const BleUuid serviceUuid("6E400001-B5A3-F393-E0A9-E50E24DCCA9E");
const BleUuid rxUuid("6E400002-B5A3-F393-E0A9-E50E24DCCA9E");
const BleUuid txUuid("6E400003-B5A3-F393-E0A9-E50E24DCCA9E");

BleCharacteristic txCharacteristic("tx", BleCharacteristicProperty::NOTIFY, txUuid, serviceUuid);
BleCharacteristic rxCharacteristic("rx", BleCharacteristicProperty::WRITE_WO_RSP, rxUuid, serviceUuid, onDataReceived, NULL);

void onDataReceived(const uint8_t *data, size_t len, const BlePeerDevice &peer, void *context)
{
  // Log.trace("Received data from: %02X:%02X:%02X:%02X:%02X:%02X:", peer.address()[0], peer.address()[1], peer.address()[2], peer.address()[3], peer.address()[4], peer.address()[5]);

  for (size_t ii = 0; ii < len; ii++)
  {
    Serial.write(data[ii]);
  }
}

void setup()
{
  Serial.begin();
  mfrc522.setSPIConfig();
  // mfrc522_b.setSPIConfig();
  mfrc522_c.setSPIConfig();
  mfrc522_d.setSPIConfig();
  mfrc522_e.setSPIConfig();

  mfrc522.PCD_Init(); // Init MFRC522 card
  // mfrc522_b.PCD_Init(); // Init MFRC522 card
  mfrc522_c.PCD_Init(); // Init MFRC522 card
  mfrc522_d.PCD_Init(); // Init MFRC522 card
  mfrc522_e.PCD_Init(); // Init MFRC522 card
  Serial.println("Scan PICC to see UID and type...");

  BLE.on();

  BLE.addCharacteristic(txCharacteristic);
  BLE.addCharacteristic(rxCharacteristic);

  BleAdvertisingData data;
  data.appendServiceUUID(serviceUuid);
  BLE.advertise(&data);
}

String check_reader(MFRC522 reader)
{
  byte bufferATQA[2];
  byte bufferSize = sizeof(bufferATQA);
  byte result = reader.PICC_WakeupA(bufferATQA, &bufferSize);
  if (!(result == MFRC522::STATUS_OK || result == MFRC522::STATUS_COLLISION))
  {
    Serial.println("STATUS is not OK or COLLISION");
    return "null";
  }

  // Select one of the cards
  if (!reader.PICC_ReadCardSerial())
  {
    return "null";
  }

  MFRC522::Uid *uid = &(reader.uid);
  String cardUidString = "";
  Serial.print("Card UID: ");
  for (byte i = 0; i < uid->size; i++)
  {
    cardUidString = String(cardUidString + String(uid->uidByte[i] < 0x10 ? "0" : ""));
    cardUidString = String(cardUidString + String(uid->uidByte[i], HEX));
  }
  Serial.println(cardUidString);

  reader.PICC_HaltA();
  return cardUidString;
}

void loop()
{
  if (BLE.connected())
  {
    uint8_t txBuf[UART_TX_BUF_SIZE];
    size_t txLen = 0;

    // while(Serial.available() && txLen < UART_TX_BUF_SIZE) {
    //     txBuf[txLen++] = Serial.read();
    //     Serial.write(txBuf[txLen - 1]);
    // }

    /////////
    lastTime = millis();

    String val_a = check_reader(mfrc522);
    // String val_b = check_reader(mfrc522_b);
    String val_c = check_reader(mfrc522_c);
    String val_d = check_reader(mfrc522_d);
    String val_e = check_reader(mfrc522_e);
    // String val_f = check_reader(mfrc522_f);

    now = millis();
    Serial.printlnf("rfid read lag: %lu ms", (now - lastTime));
    lastTime = millis();

    // publishValueMessages(val_a, val_b, val_c, val_d, val_e);
    // publishValueMessage(1, val_a);
    // publishValueMessage(2, val_b);
    // publishValueMessage(3, val_c);
    // publishValueMessage(4, val_d);
    // publishValueMessage(5, val_e);
    // publishValueMessage(6, val_f);

    // publishValueMessage(1, val_a);
    txBuf[txLen++] = '1';
    txBuf[txLen++] = ',';
    // txBuf[txLen++] = val_a;
    for (int e = 0; e < val_a.length(); e++)
    {
      txBuf[txLen++] = val_a.charAt(e);
    }
    txBuf[txLen++] = '\n';
    if (txLen > 0)
    {
      txCharacteristic.setValue(txBuf, txLen);
    }

    // publishValueMessage(3, val_a);
    txBuf[txLen++] = '3';
    txBuf[txLen++] = ',';
    // txBuf[txLen++] = val_a;
    for (int e = 0; e < val_c.length(); e++)
    {
      txBuf[txLen++] = val_c.charAt(e);
    }
    txBuf[txLen++] = '\n';
    if (txLen > 0)
    {
      txCharacteristic.setValue(txBuf, txLen);
    }

    // publishValueMessage(4, val_a);
    txBuf[txLen++] = '4';
    txBuf[txLen++] = ',';
    // txBuf[txLen++] = val_a;
    for (int e = 0; e < val_d.length(); e++)
    {
      txBuf[txLen++] = val_d.charAt(e);
    }
    txBuf[txLen++] = '\n';
    if (txLen > 0)
    {
      txCharacteristic.setValue(txBuf, txLen);
    }

    // publishValueMessage(5, val_a);
    txBuf[txLen++] = '5';
    txBuf[txLen++] = ',';
    // txBuf[txLen++] = val_a;
    for (int e = 0; e < val_e.length(); e++)
    {
      txBuf[txLen++] = val_e.charAt(e);
    }
    txBuf[txLen++] = '\n';
    if (txLen > 0)
    {
      txCharacteristic.setValue(txBuf, txLen);
    }

    now = millis();
    Serial.printlnf("send lag: %lu ms", (now - lastTime));
    /////////
  }
}