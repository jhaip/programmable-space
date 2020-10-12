const { room, myId, run } = require('../helper2')(__filename);

const code = `
#include "HttpClient.h"
#include "Adafruit_DHT.h"

#define DHTPIN 2 // what pin we're connected to

//#define DHTTYPE DHT11		// DHT 11
#define DHTTYPE DHT22 // DHT 22 (AM2302)
//#define DHTTYPE DHT21		// DHT 21 (AM2301)

// Connect pin 1 (on the left) of the sensor to +5V
// Connect pin 2 of the sensor to whatever your DHTPIN is
// Connect pin 4 (on the right) of the sensor to GROUND
// Connect a 10K resistor from pin 2 (data) to pin 1 (power) of the sensor

DHT dht(DHTPIN, DHTTYPE);

void setup()
{
    Serial.begin(9600);
    dht.begin();
}

void loop()
{
    // Wait a few seconds between measurements.
    delay(2000);

    // Reading temperature or humidity takes about 250 milliseconds!
    // Sensor readings may also be up to 2 seconds 'old' (its a
    // very slow sensor)
    float h = dht.getHumidity();
    float t = dht.getTempCelcius();
    float f = dht.getTempFarenheit();

    if (isnan(h) || isnan(t) || isnan(f))
    {
        Serial.println("Failed to read from DHT sensor!");
        return;
    }

    float hi = dht.getHeatIndex();
    float dp = dht.getDewPoint();
    float k = dht.getTempKelvin();

    Serial.print("Humid: ");
    Serial.print(h);
    Serial.print("% - ");
    Serial.print("Temp: ");
    Serial.print(t);
    Serial.print("*C ");
    Serial.print(f);
    Serial.print("*F ");
    Serial.print(k);
    Serial.print("*K - ");
    Serial.print("DewP: ");
    Serial.print(dp);
    Serial.print("*C - ");
    Serial.print("HeatI: ");
    Serial.print(hi);
    Serial.println("*C");
    Serial.println(Time.timeStr());

    char body[300];
    sprintf(body,
      "{\\"claim\\":\\"Photon%s says the humidity is %f and temp is %f\\", "
      "\\"retract\\":\\"$ $ Photon%s says the humidity is $ and temp is $\\"}",
      (const char *)myID, h, t, (const char *)myID);
    publishValueMessage(body);
}
`
room.assert(`wish`, ["text", code], `runs on the photon`)



run();
