// This #include statement was automatically added by the Particle IDE.
#include <SparkJson.h>

// This #include statement was automatically added by the Particle IDE.
#include <WS2801.h>

// This #include statement was automatically added by the Particle IDE.
#include <HttpClient.h>

/*****************************************************************************
Example sketch for driving Adafruit WS2801 pixels on the Spark Core!
  Designed specifically to work with the Adafruit RGB Pixels!
  12mm Bullet shape ----> https://www.adafruit.com/products/322
  12mm Flat shape   ----> https://www.adafruit.com/products/738
  36mm Square shape ----> https://www.adafruit.com/products/683
  These pixels use SPI to transmit the color data, and have built in
  high speed PWM drivers for 24 bit color per pixel
  2 pins are required to interface
  Adafruit invests time and resources providing this open source code,
  please support Adafruit and open-source hardware by purchasing
  products from Adafruit!
  Written by Limor Fried/Ladyada for Adafruit Industries.
  BSD license, all text above must be included in any redistribution
*****************************************************************************/

// The colors of the wires may be totally different so
// BE SURE TO CHECK YOUR PIXELS TO SEE WHICH WIRES TO USE!

// SPARK CORE SPI PINOUTS
// http://docs.spark.io/#/firmware/communication-spi
// A5 (MOSI) Yellow wire on Adafruit Pixels
// A3 (SCK) Green wire on Adafruit Pixels

// Don't forget to connect the ground wire to Arduino ground,
// and the +5V wire to a +5V supply$

const int numPixel = 20;

// Set the argument to the NUMBER of pixels.
Adafruit_WS2801 strip = Adafruit_WS2801(numPixel);

// For 36mm LED pixels: these pixels internally represent color in a
// different format.  Either of the above constructors can accept an
// optional extra parameter: WS2801_RGB is 'conventional' RGB order
// WS2801_GRB is the GRB order required by the 36mm pixels.  Other
// than this parameter, your code does not need to do anything different;
// the library will handle the format change.  Example:
//Adafruit_WS2801 strip = Adafruit_WS2801(25, WS2801_GRB);

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

void getWishes(int color[]) {
    request.ip = {192, 168, 1, 34};
    request.port = 5000;
    request.path = "/select?first=1&subscription=%5B%22%24%20wish%20RGB%20light%20strand%20is%20color%20%24r%20%24g%20%24b%22%5D";
    http.get(request, response, headers);
    Serial.print("Application>\tResponse status: ");
    Serial.println(response.status);
    Serial.println(response.body);

    StaticJsonBuffer<200> jsonBuffer;
    // char json[response.body.length() + 1];
    // response.body.toCharArray(json, response.body.length());
    char *json = strdup(response.body.c_str());
    JsonObject& root = jsonBuffer.parseObject(json);
    Serial.println(json);

    if (!root.success()) {
        Serial.println("parseObject() failed");
        color[0] = 0;
        color[1] = 20;
        color[2] = 0;
    }
    color[0] = root["r"];
    color[1] = root["g"];
    color[2] = root["b"];
}

void setup() {
    Serial.begin(9600);
  	Serial.println("RGB Lights");
    strip.begin();

    delay(50);

    int i;
    for (i=0; i < strip.numPixels(); i++) {
        strip.setPixelColor(i, 50, 0, 0);
        strip.show();
        delay(50);
    }
}

void loop() {
    int color[3] = {0, 0, 0};
    getWishes(color);
    for (int i=0; i < strip.numPixels(); i++) {
        strip.setPixelColor(i, color[0], color[1], color[2]);
    }
    strip.show();
    delay(200);
}

int color(String command) {
    // format is [RRR,GGG,BBB]
    // ie 1st red is [255,000,000]
    int red = command.substring(1,4).toInt();
    int green = command.substring(5,8).toInt();
    int blue = command.substring(9,12).toInt();
    int i;

    for (i=0; i < strip.numPixels(); i++) {
        strip.setPixelColor(i, red, green, blue);
        strip.show();
        delay(50);
    }
}
