// This #include statement was automatically added by the Particle IDE.
#include <neopixel.h>

#define PIXEL_COUNT 32     // 24 Pixels on our ring
#define PIXEL_PIN D1       // Ring uses is on D1
#define PIXEL_TYPE WS2812B // Ring uses WS2812 Pixels

Adafruit_NeoPixel strip(PIXEL_COUNT, PIXEL_PIN, PIXEL_TYPE); // Create out “ring” object

//encoder variables (rotary)
void doEncoderA();
void doEncoderB();

int encoderA = D5;
int encoderB = D6;

volatile bool A_set = false;
volatile bool B_set = false;
volatile int encoderPos = 0;
volatile int oldEncPos = 0; // rename to oldEncPos

//encoder variables (push button)
const int buttonPin = D7; // the number of the pushbutton pin

int flowerGoalState = HIGH; // HIGH = Open, LOW = Closed
int buttonState;            // the current reading from the input pin
int lastButtonState = LOW;  // the previous reading from the input pin

long lastDebounceTime = 0; // the last time the output pin was toggled
long debounceDelay = 50;   // the debounce time; increase if the output flickers

//servo variables
Servo petalServo;
static int servoPin = D0; //variable to store which pin is the signal pin
static int servoClosedMicros = 90;
static int servoOpenMicros = 5;
int pos = servoClosedMicros;

//petal animation timing variables
int frameDuration = 3000;         //number of milliseconds for complete movement
int frameElapsed = 0;             //how much of the frame has gone by, will range from 0 to frameDuration
unsigned long previousMillis = 0; //the last time we ran the position interpolation
unsigned long currentMillis = 0;  //current time, we will update this continuosly
int interval = 0;

//petal animation status variables
int movementDirection = 0; //0 = stopped, 1 opening, -1 closing

//LED animation status variables
volatile float brightness = 0.0;

void setup()
{
    //setting up the rotary encoder
    pinMode(encoderA, INPUT_PULLUP); // set pinA as an input, pulled HIGH to the logic voltage (5V or 3.3V for most cases)
    pinMode(encoderB, INPUT_PULLUP); // set pinB as an input, pulled HIGH to the logic voltage (5V or 3.3V for most cases)
    attachInterrupt(encoderA, doEncoderA, CHANGE);
    attachInterrupt(encoderB, doEncoderB, CHANGE);
    Serial.begin(115200); // start the serial monitor link

    //setting up rotary encoder push button
    pinMode(buttonPin, INPUT_PULLUP);

    //setting up the neopixels
    strip.begin();
    // strip.setBrightness(5);
    strip.show(); // Initialize all pixels to 'off'

    //setting up the servo
    petalServo.attach(servoPin); // attaches the servo on pin 9 to the servo object
}

void doEncoderA()
{
    if (digitalRead(encoderA) != A_set)
    { // debounce once more
        A_set = !A_set;
        // adjust counter + if A leads B
        if (A_set && !B_set)
            encoderPos += 1;
    }
}

// Interrupt on B changing state, same as A above
void doEncoderB()
{
    if (digitalRead(encoderB) != B_set)
    {
        B_set = !B_set;
        //  adjust counter - 1 if B leads A
        if (B_set && !A_set)
            encoderPos -= 1;
    }
}

// Input a value 0 to 255 to get a color value.
// The colours are a transition r - g - b - back to r.
uint32_t Wheel(byte WheelPos, float brightness)
{
    WheelPos = 255 - WheelPos;

    Serial.print("ratio:");
    Serial.println(brightness);

    if (WheelPos < 85)
    {
        return strip.Color(brightness * (255 - WheelPos * 3), 0, brightness * (WheelPos * 3));
    }
    if (WheelPos < 170)
    {
        WheelPos -= 85;
        return strip.Color(0, brightness * (WheelPos * 3), brightness * (255 - WheelPos * 3));
    }
    WheelPos -= 170;
    return strip.Color(brightness * (WheelPos * 3), brightness * (255 - WheelPos * 3), 0);
}

//apply colours from the wheel to the pixels
void setWheel(byte WheelPos, float brightness)
{
    for (uint16_t i = 0; i < strip.numPixels() / 2; i++)
    {
        strip.setPixelColor(i, Wheel(WheelPos, brightness));
    }
    for (uint16_t i = strip.numPixels() / 2; i < strip.numPixels(); i++)
    {
        strip.setPixelColor(i, Wheel(128 - WheelPos, brightness));
    }
    strip.show();
}

void updateFlower()
{
    unsigned long currentMillis = millis();
    interval = currentMillis - previousMillis;
    previousMillis = currentMillis;

    frameElapsed += movementDirection * interval;
    float frameElapsedRatio = float(frameElapsed) / float(frameDuration);
    brightness = frameElapsedRatio;

    if (frameElapsed < 0)
    {
        movementDirection = 0;
        frameElapsed = 0;
        Serial.println("closed");
        brightness = 0.0;
        //analogWrite(ledPin,ledOffPWM);
        petalServo.detach();
    }
    if (frameElapsed > frameDuration)
    {
        movementDirection = 0;
        frameElapsed = frameDuration;
        Serial.println("opened");
        brightness = 1.0;
        petalServo.detach();
    }

    if (movementDirection != 0)
    {

        //determine new position/brightness by interpolation between endpoints
        //int newLedValue = (ledOffPWM + int(frameElapsedRatio*(ledOnPWM - ledOffPWM)));
        int newServoMicros = (servoClosedMicros + int(frameElapsedRatio * (servoOpenMicros - servoClosedMicros)));

        petalServo.write(newServoMicros);
    }
    setWheel(encoderPos, brightness);
}

void loop()
{
    if (oldEncPos != encoderPos)
    {
        Serial.println(encoderPos);
        updateFlower();
        oldEncPos = encoderPos;
    }

    // read the state of the switch into a local variable:
    int reading = digitalRead(buttonPin);

    // check to see if you just pressed the button
    // (i.e. the input went from LOW to HIGH),  and you've waited
    // long enough since the last press to ignore any noise:

    // If the switch changed, due to noise or pressing:
    if (reading != lastButtonState)
    {
        // reset the debouncing timer
        lastDebounceTime = millis();
    }

    if ((millis() - lastDebounceTime) > debounceDelay)
    {
        // whatever the reading is at, it's been there for longer
        // than the debounce delay, so take it as the actual current state:

        // if the button state has changed:
        if (reading != buttonState)
        {
            buttonState = reading;

            // only toggle the LED if the new button state is HIGH
            if (buttonState == HIGH)
            {
                if (movementDirection == 0)
                {
                    flowerGoalState = !flowerGoalState;
                    if (flowerGoalState == HIGH)
                    {
                        movementDirection = 1;
                    }
                    else
                    {
                        movementDirection = -1;
                    }
                    Serial.print("movement direction:");
                    Serial.println(movementDirection);
                    petalServo.attach(servoPin); //we reattach each time the a movement is started
                }
                Serial.println("Push button pushed");
            }
        }
    }
    // save the reading.  Next time through the loop,
    // it'll be the lastButtonState:
    lastButtonState = reading;

    updateFlower();
}
