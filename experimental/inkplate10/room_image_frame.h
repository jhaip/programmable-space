// Next 3 lines are a precaution, you can ignore those, and the example would also work without them
#ifndef ARDUINO_INKPLATE10
#error "Wrong board selection for this example, please select Inkplate 10 in the boards menu."
#endif

#include "Inkplate.h"

Inkplate display(INKPLATE_3BIT);

const char ssid[] = "";    // Your WiFi SSID
const char *password = ""; // Your WiFi password

void setup()
{
    Serial.begin(115200);
    display.begin();

    // Join wifi
    display.joinAP(ssid, password);

    char url[256];
    imageUrl(url);

    Serial.println(display.drawImage(url, display.PNG, 0, 0));
    display.display();

    Serial.println("Going to sleep");
    delay(100);
    esp_sleep_enable_timer_wakeup(15ll * 60 * 1000 * 1000);
    esp_deep_sleep_start();
}

void loop()
{
    // Never here, as deepsleep restarts esp32
}

void imageUrl(char *a)
{
    String url;
    HTTPClient http;
    // wish $url would be shown on eink frame
    if (http.begin("http://192.168.1.34:3000/select?query=%5B%22%24%20%24%20wish%20%24url%20would%20be%20shown%20on%20eink%20frame%22%5D") && http.GET() > 0)
    {
        url = http.getString();

        int urlStart = url.indexOf("[{\"url\":[\"text\",\"") + 17;
        int urlEnd = url.indexOf("\"]}]", urlStart);

        url = url.substring(urlStart, urlEnd);

        Serial.println(url);
        strcpy(a, url.c_str());
    }
    else
    {
        display.println("HTTP error");
        display.display();
    }
    http.end();
}