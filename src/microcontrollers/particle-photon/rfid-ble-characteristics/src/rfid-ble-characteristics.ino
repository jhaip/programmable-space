#include "Particle.h"

// This example does not require the cloud so you can run it in manual mode or
// normal cloud-connected mode
// SYSTEM_MODE(MANUAL);

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

SerialLogHandler logHandler(LOG_LEVEL_TRACE);

const unsigned long UPDATE_INTERVAL_MS = 2000;
unsigned long lastUpdate = 0;

const BleUuid serviceUuid("4677062c-ad02-4034-9abf-98581772427c");
const BleUuid valueUuid("dc13b36a-3499-46b0-ac11-5ac0173c4cc5");

BleCharacteristic valueCharacteristic("rfidsensors", BleCharacteristicProperty::NOTIFY, valueUuid, serviceUuid);

uint8_t lastSensorValue[16] = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};

void check_reader(MFRC522 reader, uint8_t charUuidBytes[])
{
  byte bufferATQA[2];
  byte bufferSize = sizeof(bufferATQA);
  byte result = reader.PICC_WakeupA(bufferATQA, &bufferSize);
  if (!(result == MFRC522::STATUS_OK || result == MFRC522::STATUS_COLLISION))
  {
    Serial.println("STATUS is not OK or COLLISION");
    return;
  }

  // Select one of the cards
  if (!reader.PICC_ReadCardSerial())
  {
    return;
  }

  MFRC522::Uid *uid = &(reader.uid);
  String cardUidString = "";
  Serial.print("Card UID: ");
  Serial.println(uid->size);
  for (byte i = 0; i < uid->size; i++)
  {
    cardUidString = String(cardUidString + String(uid->uidByte[i] < 0x10 ? "0" : ""));
    cardUidString = String(cardUidString + String(uid->uidByte[i], HEX));
    charUuidBytes[i] = uid->uidByte[i];
  }
  Serial.println(cardUidString);

  reader.PICC_HaltA();
}

void setup()
{
  (void)logHandler; // Does nothing, just to eliminate the unused variable warning

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

  BLE.addCharacteristic(valueCharacteristic);

  BleAdvertisingData data;
  data.appendServiceUUID(serviceUuid);
  BLE.advertise(&data);
}

void loop()
{
  if (BLE.connected())
  {
    uint8_t buf[16];
    uint8_t val_a[4] = { 0, 0, 0, 0};
    uint8_t val_c[4] = { 0, 0, 0, 0};
    uint8_t val_d[4] = { 0, 0, 0, 0};
    uint8_t val_e[4] = { 0, 0, 0, 0};
    check_reader(mfrc522, val_a);
    check_reader(mfrc522_c, val_c);
    check_reader(mfrc522_d, val_d);
    check_reader(mfrc522_e, val_e);

    memcpy(&buf[0], &val_a, 4);
    memcpy(&buf[4], &val_c, 4);
    memcpy(&buf[8], &val_d, 4);
    memcpy(&buf[12], &val_e, 4);

    Serial.println("SETTING VALUE");
    for (int i = 0; i < sizeof(buf); i++) {
      Serial.println(buf[i], HEX);
    }

    valueCharacteristic.setValue(buf, sizeof(buf));
  }
}
