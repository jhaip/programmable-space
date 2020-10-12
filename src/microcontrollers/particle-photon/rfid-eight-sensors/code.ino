// This #include statement was automatically added by the Particle IDE.
#include "MFRC522.h"

// This #include statement was automatically added by the Particle IDE.
#include <HttpClient.h>

// #include "SparkJson.h"
// #include "HttpClient.h"

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
// #include "MFRC522.h"

#define RST_PIN A0

#define SS_PIN D0
#define SS_PIN_B D1
#define SS_PIN_C D2
#define SS_PIN_D D3
#define SS_PIN_E D4
#define SS_PIN_F D5
#define SS_PIN_G D6
#define SS_PIN_H D7

// Create MFRC522 instances
MFRC522 mfrc522(SS_PIN, RST_PIN);
MFRC522 mfrc522_b(SS_PIN_B, RST_PIN);
MFRC522 mfrc522_c(SS_PIN_C, RST_PIN);
MFRC522 mfrc522_d(SS_PIN_D, RST_PIN);
MFRC522 mfrc522_e(SS_PIN_E, RST_PIN);
MFRC522 mfrc522_f(SS_PIN_F, RST_PIN);
MFRC522 mfrc522_g(SS_PIN_G, RST_PIN);
MFRC522 mfrc522_h(SS_PIN_H, RST_PIN);

String prev_a = "null";
String prev_b = "null";
String prev_c = "null";
String prev_d = "null";
String prev_e = "null";
String prev_f = "null";
String prev_g = "null";
String prev_h = "null";

byte DEBOUNCE_SENSOR_NULL_LIMIT = 3;
byte sensor_null_count_a = DEBOUNCE_SENSOR_NULL_LIMIT;
byte sensor_null_count_b = DEBOUNCE_SENSOR_NULL_LIMIT;
byte sensor_null_count_c = DEBOUNCE_SENSOR_NULL_LIMIT;
byte sensor_null_count_d = DEBOUNCE_SENSOR_NULL_LIMIT;
byte sensor_null_count_e = DEBOUNCE_SENSOR_NULL_LIMIT;
byte sensor_null_count_f = DEBOUNCE_SENSOR_NULL_LIMIT;
byte sensor_null_count_g = DEBOUNCE_SENSOR_NULL_LIMIT;
byte sensor_null_count_h = DEBOUNCE_SENSOR_NULL_LIMIT;

HttpClient http;

// Headers currently need to be set at init, useful for API keys etc.
http_header_t headers[] = {
    {"Content-Type", "application/json"},
    {"Accept", "application/json"},
    {"Accept", "*/*"},
    {NULL, NULL} // NOTE: Always terminate headers will NULL
};

http_request_t request;
http_response_t response;

String myID = System.deviceID();

unsigned long lastTime = 0;
unsigned long now = 0;

void publishValueMessages(String val1, String val2, String val3, String val4, String val5, String val6, String val7, String val8)
{
    char str[600];
    sprintf(str, "{\"claim\":[\"Photon%s read \\\"%s\\\" on sensor %i\", \"Photon%s read \\\"%s\\\" on sensor %i\", \"Photon%s read \\\"%s\\\" on sensor %i\", \"Photon%s read \\\"%s\\\" on sensor %i\", \"Photon%s read \\\"%s\\\" on sensor %i\", \"Photon%s read \\\"%s\\\" on sensor %i\", \"Photon%s read \\\"%s\\\" on sensor %i\", \"Photon%s read \\\"%s\\\" on sensor %i\"], \"retract\":\"$ $ Photon%s read $ on sensor $\"}",
            (const char *)myID, val1.c_str(), 1,
            (const char *)myID, val2.c_str(), 2,
            (const char *)myID, val3.c_str(), 3,
            (const char *)myID, val4.c_str(), 4,
            (const char *)myID, val5.c_str(), 5,
            (const char *)myID, val6.c_str(), 6,
            (const char *)myID, val7.c_str(), 7,
            (const char *)myID, val8.c_str(), 8,
            (const char *)myID);
    Serial.println(str);
    request.ip = {192, 168, 1, 34};
    request.port = 5000;
    request.path = "/cleanup-claim";
    request.body = str;
    Serial.println(request.body);
    http.post(request, response, headers);
    Serial.print("Application>\tResponse status: ");
    Serial.println(response.status);
}

bool check_firmware(MFRC522 reader)
{
    delay(5);
    byte v = reader.PCD_ReadRegister(MFRC522::VersionReg);
    Serial.println(v, HEX);
    return v == 0x92;
}

void setup()
{
    Serial.begin(9600); // Initialize serial communications with the
    while (!Serial)
        ; // Do nothing if no serial port is opened (added for Arduinos based on ATMEGA32U4)
    delay(100);

    mfrc522.setSPIConfig();
    mfrc522_b.setSPIConfig();
    mfrc522_c.setSPIConfig();
    mfrc522_d.setSPIConfig();
    mfrc522_e.setSPIConfig();
    mfrc522_f.setSPIConfig();
    mfrc522_g.setSPIConfig();
    mfrc522_h.setSPIConfig();

    mfrc522.PCD_Init();   // Init MFRC522 card
    mfrc522_b.PCD_Init(); // Init MFRC522 card
    mfrc522_c.PCD_Init(); // Init MFRC522 card
    mfrc522_d.PCD_Init(); // Init MFRC522 card
    mfrc522_e.PCD_Init(); // Init MFRC522 card
    mfrc522_f.PCD_Init(); // Init MFRC522 card
    mfrc522_g.PCD_Init(); // Init MFRC522 card
    mfrc522_h.PCD_Init(); // Init MFRC522 card

    check_firmware(mfrc522);
    check_firmware(mfrc522_b);
    check_firmware(mfrc522_c);
    check_firmware(mfrc522_d);
    check_firmware(mfrc522_e);
    check_firmware(mfrc522_f);
    check_firmware(mfrc522_g);
    check_firmware(mfrc522_h);
    Serial.println("Scan PICC to see UID and type...");
}

String check_reader_new(MFRC522 reader)
{
    String ret = "null";
    if (reader.PICC_IsNewCardPresent() && reader.PICC_ReadCardSerial())
    {
        MFRC522::Uid *uid = &(reader.uid);
        String cardUidString = "";
        // Serial.print("Card UID: ");
        for (byte i = 0; i < uid->size; i++)
        {
            cardUidString = String(cardUidString + String(uid->uidByte[i] < 0x10 ? "0" : ""));
            cardUidString = String(cardUidString + String(uid->uidByte[i], HEX));
        }
        ret = cardUidString;

        reader.PICC_HaltA();
        reader.PCD_StopCrypto1();
    }
    return ret;
}

String check_reader(MFRC522 reader)
{
    byte bufferATQA[2];
    byte bufferSize = sizeof(bufferATQA);
    byte result = reader.PICC_WakeupA(bufferATQA, &bufferSize);
    if (!(result == MFRC522::STATUS_OK || result == MFRC522::STATUS_COLLISION))
    {
        // Serial.println("STATUS is not OK or COLLISION");
        return "null";
    }

    // Select one of the cards
    if (!reader.PICC_ReadCardSerial())
    {
        return "null";
    }

    MFRC522::Uid *uid = &(reader.uid);
    String cardUidString = "";
    // Serial.print("Card UID: ");
    for (byte i = 0; i < uid->size; i++)
    {
        cardUidString = String(cardUidString + String(uid->uidByte[i] < 0x10 ? "0" : ""));
        cardUidString = String(cardUidString + String(uid->uidByte[i], HEX));
    }
    // Serial.println(cardUidString);

    reader.PICC_HaltA();
    return cardUidString;
}

void loop()
{
    delay(100);

    lastTime = millis();

    String val_a = check_reader(mfrc522);
    // delay(50);
    String val_b = check_reader(mfrc522_b);
    // delay(50);
    String val_c = check_reader(mfrc522_c);
    // delay(50);
    String val_d = check_reader(mfrc522_d);
    // delay(50);
    String val_e = check_reader(mfrc522_e);
    // delay(50);
    String val_f = check_reader(mfrc522_f);
    // delay(50);
    String val_g = check_reader(mfrc522_g);
    // delay(50);
    String val_h = check_reader(mfrc522_h);

    Serial.printlnf("%s %s %s %s %s %s %s %s", val_a.c_str(), val_b.c_str(), val_c.c_str(), val_d.c_str(), val_e.c_str(), val_f.c_str(), val_g.c_str(), val_h.c_str());

    bool some_change = false;
    if (val_a != "null")
    {
        if (sensor_null_count_a == DEBOUNCE_SENSOR_NULL_LIMIT)
        {
            some_change = true;
        }
        sensor_null_count_a = 0;
        prev_a = val_a;
    }
    else if (sensor_null_count_a < DEBOUNCE_SENSOR_NULL_LIMIT)
    {
        sensor_null_count_a += 1;
        prev_a = "null";
        if (sensor_null_count_a == DEBOUNCE_SENSOR_NULL_LIMIT)
        {
            some_change = true;
        }
    }

    if (val_b != "null")
    {
        if (sensor_null_count_b == DEBOUNCE_SENSOR_NULL_LIMIT)
        {
            some_change = true;
        }
        sensor_null_count_b = 0;
        prev_b = val_b;
    }
    else if (sensor_null_count_b < DEBOUNCE_SENSOR_NULL_LIMIT)
    {
        sensor_null_count_b += 1;
        prev_b = "null";
        if (sensor_null_count_b == DEBOUNCE_SENSOR_NULL_LIMIT)
        {
            some_change = true;
        }
    }

    if (val_c != "null")
    {
        if (sensor_null_count_c == DEBOUNCE_SENSOR_NULL_LIMIT)
        {
            some_change = true;
        }
        sensor_null_count_c = 0;
        prev_c = val_c;
    }
    else if (sensor_null_count_c < DEBOUNCE_SENSOR_NULL_LIMIT)
    {
        sensor_null_count_c += 1;
        prev_c = "null";
        if (sensor_null_count_c == DEBOUNCE_SENSOR_NULL_LIMIT)
        {
            some_change = true;
        }
    }

    if (val_d != "null")
    {
        if (sensor_null_count_d == DEBOUNCE_SENSOR_NULL_LIMIT)
        {
            some_change = true;
        }
        sensor_null_count_d = 0;
        prev_d = val_d;
    }
    else if (sensor_null_count_d < DEBOUNCE_SENSOR_NULL_LIMIT)
    {
        sensor_null_count_d += 1;
        prev_d = "null";
        if (sensor_null_count_d == DEBOUNCE_SENSOR_NULL_LIMIT)
        {
            some_change = true;
        }
    }

    if (val_e != "null")
    {
        if (sensor_null_count_e == DEBOUNCE_SENSOR_NULL_LIMIT)
        {
            some_change = true;
        }
        sensor_null_count_e = 0;
        prev_e = val_e;
    }
    else if (sensor_null_count_d < DEBOUNCE_SENSOR_NULL_LIMIT)
    {
        sensor_null_count_d += 1;
        prev_e = "null";
        if (sensor_null_count_e == DEBOUNCE_SENSOR_NULL_LIMIT)
        {
            some_change = true;
        }
    }

    if (val_f != "null")
    {
        if (sensor_null_count_f == DEBOUNCE_SENSOR_NULL_LIMIT)
        {
            some_change = true;
        }
        sensor_null_count_f = 0;
        prev_f = val_f;
    }
    else if (sensor_null_count_f < DEBOUNCE_SENSOR_NULL_LIMIT)
    {
        sensor_null_count_f += 1;
        prev_f = "null";
        if (sensor_null_count_f == DEBOUNCE_SENSOR_NULL_LIMIT)
        {
            some_change = true;
        }
    }

    if (val_g != "null")
    {
        if (sensor_null_count_g == DEBOUNCE_SENSOR_NULL_LIMIT)
        {
            some_change = true;
        }
        sensor_null_count_g = 0;
        prev_g = val_g;
    }
    else if (sensor_null_count_g < DEBOUNCE_SENSOR_NULL_LIMIT)
    {
        sensor_null_count_g += 1;
        prev_g = "null";
        if (sensor_null_count_g == DEBOUNCE_SENSOR_NULL_LIMIT)
        {
            some_change = true;
        }
    }

    if (val_h != "null")
    {
        if (sensor_null_count_h == DEBOUNCE_SENSOR_NULL_LIMIT)
        {
            some_change = true;
        }
        sensor_null_count_h = 0;
        prev_h = val_h;
    }
    else if (sensor_null_count_h < DEBOUNCE_SENSOR_NULL_LIMIT)
    {
        sensor_null_count_h += 1;
        prev_h = "null";
        if (sensor_null_count_h == DEBOUNCE_SENSOR_NULL_LIMIT)
        {
            some_change = true;
        }
    }

    if (some_change)
    {
        Serial.println("Change!");
        publishValueMessages(
            prev_a,
            prev_b,
            prev_c,
            prev_d,
            prev_e,
            prev_f,
            prev_g,
            prev_h);
    }

    // now = millis();
    // Serial.printlnf("rfid read lag: %lu ms", (now - lastTime));
    // lastTime = millis();

    /*
    publishValueMessages(
            val_a,
            val_b,
            val_c,
            val_d,
            val_e,
            val_f,
            val_g,
            val_h);
    
    
    if (
        prev_a != val_a ||
        prev_b != val_b ||
        prev_c != val_c ||
        prev_d != val_d ||
        prev_e != val_e ||
        prev_f != val_f ||
        prev_g != val_g ||
        prev_h != val_h)
    {
        Serial.println("Change!");
        // publishValueMessages(
        //     val_a,
        //     val_b,
        //     val_c,
        //     val_d,
        //     val_e,
        //     val_f,
        //     val_g,
        //     val_h);
        prev_a = val_a;
        prev_b = val_b;
        prev_c = val_c;
        prev_d = val_d;
        prev_e = val_e;
        prev_f = val_f;
        prev_g = val_g;
        prev_h = val_h;
    }
    */

    // now = millis();
    // Serial.printlnf("send lag: %lu ms", (now - lastTime));
}
