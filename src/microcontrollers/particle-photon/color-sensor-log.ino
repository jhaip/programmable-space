// This #include statement was automatically added by the Particle IDE.
#include <HttpClient.h>

// This #include statement was automatically added by the Particle IDE.
#include <Adafruit_TCS34725.h>
#include <math.h>

char szInfo[128];
Adafruit_TCS34725 tcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X);
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

void retract() {
    char str[150];
    // sprintf(str, "facts=\"Photon %s\" says the humidity is $ and temp is $", (const char*)myID);
    sprintf(str, "{\"facts\":\"Photon%s says the humidity is $ and temp is $\"}", (const char*)myID);
  
    // Particle.publish("retract", str, PRIVATE);
    // request.hostname = "requestbin.fullcontact.com"; // "10.0.0.162";
    request.ip = {192, 168, 1, 34}; // {52, 222, 150, 205};
    request.port = 5000;
    request.path = "/retract"; // "/18fjmkf1";
    request.body = str;
    Serial.println(request.body);
    http.post(request, response, headers);
    Serial.print("Application>\tResponse status: ");
    Serial.println(response.status);
}

void publishValueMessage(int r, int g, int b) {
    char str[300];
    // sprintf(str, "facts=\"Photon %s\" says the humidity is %f and temp is %f", (const char*)myID, humidity, temp);
    // sprintf(str, "{\"facts\":\"Photon%s says the humidity is %f and temp is %f\"}", (const char*)myID, humidity, temp);
    sprintf(str, "{\"claim\":\"Photon%s sees color ( %i , %i , %i )\", \"retract\":\"$ Photon%s sees color ( $ , $ , $ )\"}", (const char*)myID, r, g, b, (const char*)myID);
    // Serial.println(str);
    // Particle.publish("assert", str, PRIVATE);
    // request.hostname = NULL; // "10.0.0.162";
    request.ip = {192, 168, 1, 34};
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
	Serial.println("Color View Test!");

	if (tcs.begin()) {
        Serial.println("Found sensor");
    } else {
        Serial.println("No TCS34725 found ... check your connections");
        while (1); // halt!
    }
}

void loop() {
	uint16_t clear, red, green, blue;

    tcs.setInterrupt(false);      // turn on LED
    
    delay(60);  // takes 50ms to read 
      
    tcs.getRawData(&red, &green, &blue, &clear);
    tcs.setInterrupt(true);  // turn off LED
    
    // Figure out some basic hex code for visualization
    uint32_t sum = clear;
    float r, g, b;
    
    r = red; r /= sum;
    g = green; g /= sum;
    b = blue; b /= sum;
    r *= 256; g *= 256; b *= 256;
    
    sprintf(szInfo, "%d,%d,%d", (int)r, (int)g, (int)b);
    
    Spark.publish("colorinfo", szInfo);
    
    Serial.println(szInfo);
    
    delay(1000);
	
	// retract();
	publishValueMessage((int)r, (int)g, (int)b);
}

