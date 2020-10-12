// This #include statement was automatically added by the Particle IDE.
#include <HttpClient.h>

// This #include statement was automatically added by the Particle IDE.
#include <Adafruit_DHT.h>

#include "Adafruit_DHT.h"

// Example testing sketch for various DHT humidity/temperature sensors
// Written by ladyada, public domain

#define DHTPIN 2     // what pin we're connected to

// Uncomment whatever type you're using!
//#define DHTTYPE DHT11		// DHT 11 
#define DHTTYPE DHT22		// DHT 22 (AM2302)
//#define DHTTYPE DHT21		// DHT 21 (AM2301)

// Connect pin 1 (on the left) of the sensor to +5V
// Connect pin 2 of the sensor to whatever your DHTPIN is
// Connect pin 4 (on the right) of the sensor to GROUND
// Connect a 10K resistor from pin 2 (data) to pin 1 (power) of the sensor

DHT dht(DHTPIN, DHTTYPE);
HttpClient http;

// Headers currently need to be set at init, useful for API keys etc.
http_header_t headers[] = {
    { "Content-Type", "application/json" },
    { "Accept" , "application/json" },
    { "Accept" , "*/*"},
    { NULL, NULL } // NOTE: Always terminate headers will NULL
};

http_request_t request;
http_response_t response;

String myID = System.deviceID();

void publishValueMessage(float humidity, float temp) {
    char str[300];
    // sprintf(str, "facts=\"Photon %s\" says the humidity is %f and temp is %f", (const char*)myID, humidity, temp);
    // sprintf(str, "{\"facts\":\"Photon%s says the humidity is %f and temp is %f\"}", (const char*)myID, humidity, temp);
    sprintf(str, "{\"claim\":\"Photon%s says the humidity is %f and temp is %f\", \"retract\":\"$ Photon%s says the humidity is $ and temp is $\"}", (const char*)myID, humidity, temp, (const char*)myID);
    // Serial.println(str);
    // Particle.publish("assert", str, PRIVATE);
    // request.hostname = NULL; // "10.0.0.162";
    request.ip = {10, 0, 0, 2};
    request.port = 5000;
    request.path = "/cleanup-claim";
    // request.body = "{\"test\": 5}"; // str;
    request.body = str;
    Serial.println(request.body);
    http.post(request, response, headers);
    Serial.print("Application>\tResponse status: ");
    Serial.println(response.status);
}

void setup() {
	Serial.begin(9600); 
	Serial.println("DHTxx test!");

	dht.begin();
}

void loop() {
// Wait a few seconds between measurements.
	delay(2000);

    // Reading temperature or humidity takes about 250 milliseconds!
    // Sensor readings may also be up to 2 seconds 'old' (its a 
    // very slow sensor)
	float h = dht.getHumidity();
    // Read temperature as Celsius
	float t = dht.getTempCelcius();
    // Read temperature as Farenheit
	float f = dht.getTempFarenheit();
  
    // Check if any reads failed and exit early (to try again).
	if (isnan(h) || isnan(t) || isnan(f)) {
		Serial.println("Failed to read from DHT sensor!");
		return;
	}

    // Compute heat index
    // Must send in temp in Fahrenheit!
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
	
	publishValueMessage(h, t);
}

