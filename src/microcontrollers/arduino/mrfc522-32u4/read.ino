/**
 * --------------------------------------------------------------------------------------------------------------------
 * Example sketch/program showing how to read data from more than one PICC to serial.
 * --------------------------------------------------------------------------------------------------------------------
 * This is a MFRC522 library example; for further details and other examples see: https://github.com/miguelbalboa/rfid
 *
 * Example sketch/program showing how to read data from more than one PICC (that is: a RFID Tag or Card) using a
 * MFRC522 based RFID Reader on the Arduino SPI interface.
 *
 * Warning: This may not work! Multiple devices at one SPI are difficult and cause many trouble!! Engineering skill
 *          and knowledge are required!
 *
 * @license Released into the public domain.
 *
 * Typical pin layout used:
 * -----------------------------------------------------------------------------------------
 *             MFRC522      Arduino       Arduino   Arduino    Arduino          Arduino
 *             Reader/PCD   Uno/101       Mega      Nano v3    Leonardo/Micro   Pro Micro
 * Signal      Pin          Pin           Pin       Pin        Pin              Pin
 * -----------------------------------------------------------------------------------------
 * RST/Reset   RST          9             5         D9         RESET/ICSP-5     RST
 * SPI SS 1    SDA(SS)      ** custom, take a unused pin, only HIGH/LOW required **
 * SPI SS 2    SDA(SS)      ** custom, take a unused pin, only HIGH/LOW required **
 * SPI MOSI    MOSI         11 / ICSP-4   51        D11        ICSP-4           16
 * SPI MISO    MISO         12 / ICSP-1   50        D12        ICSP-1           14
 * SPI SCK     SCK          13 / ICSP-3   52        D13        ICSP-3           15
 *
 */

#include <SPI.h>
#include <MFRC522.h>

#define RST_PIN 9   // Configurable, see typical pin layout above
#define SS_1_PIN 10 // Configurable, take a unused pin, only HIGH/LOW required, must be diffrent to SS 2
#define SS_2_PIN 7  // Configurable, take a unused pin, only HIGH/LOW required, must be diffrent to SS 1
#define SS_3_PIN 6
#define SS_4_PIN 5

#define NR_OF_READERS 4

byte ssPins[] = {SS_1_PIN, SS_2_PIN, SS_3_PIN, SS_4_PIN};

bool rfid_tag_present_prev[] = {false, false, false, false};
bool rfid_tag_present[] = {false, false, false, false};
int _rfid_error_counter[] = {0, 0, 0, 0};
bool _tag_found[] = {false, false, false, false};

MFRC522 mfrc522[NR_OF_READERS]; // Create MFRC522 instance.

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
    Serial.print("Card UID: ");
    for (byte i = 0; i < uid->size; i++)
    {
        cardUidString = String(cardUidString + String(uid->uidByte[i] < 0x10 ? "0" : ""));
        cardUidString = String(cardUidString + String(uid->uidByte[i], HEX));
    }
    // Serial.println(cardUidString);

    // Halt PICC
    reader.PICC_HaltA();
    // Stop encryption on PCD
    reader.PCD_StopCrypto1();

    return cardUidString;
}

bool read2(MFRC522 reader)
{
    // Detect Tag without looking for collisions
    byte bufferATQA[2];
    byte bufferSize = sizeof(bufferATQA);

    // Reset baud rates
    reader.PCD_WriteRegister(reader.TxModeReg, 0x00);
    reader.PCD_WriteRegister(reader.RxModeReg, 0x00);
    // Reset ModWidthReg
    reader.PCD_WriteRegister(reader.ModWidthReg, 0x26);

    MFRC522::StatusCode result = reader.PICC_RequestA(bufferATQA, &bufferSize);

    bool _tag_found = false;

    if (result == reader.STATUS_OK)
    {
        if (!reader.PICC_ReadCardSerial())
        { //Since a PICC placed get Serial and continue
            return;
        }
        _tag_found = true;
    }

    return _tag_found;
}

bool check3(uint8_t reader)
{
    rfid_tag_present_prev[reader] = rfid_tag_present[reader];

    _rfid_error_counter[reader] += 1;
    if (_rfid_error_counter[reader] > 2)
    {
        _tag_found[reader] = false;
    }

    // Detect Tag without looking for collisions
    byte bufferATQA[2];
    byte bufferSize = sizeof(bufferATQA);

    // Reset baud rates
    mfrc522[reader].PCD_WriteRegister(mfrc522[reader].TxModeReg, 0x00);
    mfrc522[reader].PCD_WriteRegister(mfrc522[reader].RxModeReg, 0x00);
    // Reset ModWidthReg
    mfrc522[reader].PCD_WriteRegister(mfrc522[reader].ModWidthReg, 0x26);

    MFRC522::StatusCode result = mfrc522[reader].PICC_RequestA(bufferATQA, &bufferSize);

    if (result == mfrc522[reader].STATUS_OK)
    {
        if (!mfrc522[reader].PICC_ReadCardSerial())
        { //Since a PICC placed get Serial and continue
            return;
        }
        _rfid_error_counter[reader] = 0;
        _tag_found[reader] = true;
    }

    rfid_tag_present[reader] = _tag_found[reader];

    // rising edge
    if (rfid_tag_present[reader] && !rfid_tag_present_prev[reader])
    {
        //    Serial.print(reader);
        //    Serial.println(" Tag found");

        MFRC522::Uid *uid = &(mfrc522[reader].uid);
        String cardUidString = "";
        Serial.print(reader);
        Serial.print(" Card UID: ");
        for (byte i = 0; i < uid->size; i++)
        {
            cardUidString = String(cardUidString + String(uid->uidByte[i] < 0x10 ? "0" : ""));
            cardUidString = String(cardUidString + String(uid->uidByte[i], HEX));
        }
        Serial.println(cardUidString);
    }

    // falling edge
    if (!rfid_tag_present[reader] && rfid_tag_present_prev[reader])
    {
        //    Serial.print(reader);
        //    Serial.println(" Tag gone");
        Serial.print(reader);
        Serial.println(" Card UID: null");
    }
}

/**
 * Initialize.`
 */
void setup()
{

    Serial.begin(9600); // Initialize serial communications with the PC
    while (!Serial)
        ; // Do nothing if no serial port is opened (added for Arduinos based on ATMEGA32U4)

    delay(100);

    SPI.begin(); // Init SPI bus

    for (int i = 0; i < 6; ++i)
    {
        bool gotAllCorrectFirmwares = true;
        for (uint8_t reader = 0; reader < NR_OF_READERS; reader++)
        {
            mfrc522[reader].PCD_Init(ssPins[reader], RST_PIN); // Init each MFRC522 card
            delay(5);
            Serial.print(F("Reader "));
            Serial.print(reader);
            Serial.print(F(": "));
            byte v = mfrc522[reader].PCD_ReadRegister(MFRC522::VersionReg);
            Serial.println(v, HEX);
            // mfrc522[reader].PCD_DumpVersionToSerial();
            if (v != 0x92)
            {
                gotAllCorrectFirmwares = false;
            }
        }
        if (gotAllCorrectFirmwares == false)
        {
            Serial.println("didn't receive trying correct firmware message. Trying again...");
            delay(1000);
        }
        else
        {
            break;
        }
    }
}

/**
 * Main loop.
 */
void loop()
{
    for (uint8_t reader = 0; reader < NR_OF_READERS; reader++)
    {
        //    String val = check_reader(mfrc522[reader]);
        ////    bool val = read2(mfrc522[reader]);
        //    Serial.print(F("Reader "));
        //    Serial.print(reader);
        //    Serial.print(" = ");
        //    Serial.println(val);
        ////    delay(100);
        ////
        //    delay(10);
        //    continue;
        check3(reader);
        continue;

        // Look for new cards

        if (mfrc522[reader].PICC_IsNewCardPresent() && mfrc522[reader].PICC_ReadCardSerial())
        {
            Serial.print(F("Reader "));
            Serial.print(reader);
            // Show some details of the PICC (that is: the tag/card)
            Serial.print(F(": Card UID:"));
            dump_byte_array(mfrc522[reader].uid.uidByte, mfrc522[reader].uid.size);
            Serial.println();
            Serial.print(F("PICC type: "));
            MFRC522::PICC_Type piccType = mfrc522[reader].PICC_GetType(mfrc522[reader].uid.sak);
            Serial.println(mfrc522[reader].PICC_GetTypeName(piccType));

            // Halt PICC
            mfrc522[reader].PICC_HaltA();
            // Stop encryption on PCD
            mfrc522[reader].PCD_StopCrypto1();
        }
        else
        {
            Serial.print(F("Reader "));
            Serial.print(reader);
            Serial.println(" has nothing ---");
        }
    } //for(uint8_t reader
      // delay(100);
}

/**
 * Helper routine to dump a byte array as hex values to Serial.
 */
void dump_byte_array(byte *buffer, byte bufferSize)
{
    for (byte i = 0; i < bufferSize; i++)
    {
        Serial.print(buffer[i] < 0x10 ? " 0" : " ");
        Serial.print(buffer[i], HEX);
    }
}