// This #include statement was automatically added by the Particle IDE.
#include <neopixel.h>

#define PIXEL_COUNT 32     // 24 Pixels on our ring
#define PIXEL_PIN D1       // Ring uses is on D1
#define PIXEL_TYPE WS2812B // Ring uses WS2812 Pixels

Adafruit_NeoPixel strip(PIXEL_COUNT, PIXEL_PIN, PIXEL_TYPE); // Create out “ring” object

int setOpenValue(String command);
volatile bool performingMove = false;
volatile long moveStartMillis = 0;
volatile float startRatioValue = 0;
volatile float endRatioValue = 0;
volatile int moveDuration = 0;

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

//LED animation status variables
volatile float brightness = 0.0;

void setup()
{
    bool successAttachingSetOpenValue = Particle.function("setOpenValue", setOpenValue);

    //setting up the rotary encoder
    pinMode(encoderA, INPUT_PULLUP); // set pinA as an input, pulled HIGH to the logic voltage (5V or 3.3V for most cases)
    pinMode(encoderB, INPUT_PULLUP); // set pinB as an input, pulled HIGH to the logic voltage (5V or 3.3V for most cases)
    attachInterrupt(encoderA, doEncoderA, CHANGE);
    attachInterrupt(encoderB, doEncoderB, CHANGE);
    Serial.begin(115200); // start the serial monitor link

    Serial.print("Success attaching setOpenValue?:");
    Serial.println(successAttachingSetOpenValue);

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

    // Serial.print("ratio:");
    // Serial.println(brightness);

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

void startMove(float goalRatio)
{
    Serial.print("starting move to:");
    Serial.println(goalRatio);
    float ratioChangeAbs = goalRatio - brightness * 1.0;
    if (ratioChangeAbs < 0) {
        ratioChangeAbs *= -1.0;
    }
    if (ratioChangeAbs < 0.01)
    {
        Serial.println("ignoring move, within 1% of current value");
        Serial.println(endRatioValue);
        Serial.println(startRatioValue);
        Serial.println(ratioChangeAbs);
        Serial.println("yeah");
        return;
    }
    // if (!performingMove)
    // {
    //     Serial.println("attached servo");
    //     petalServo.attach(servoPin);
    // }
    performingMove = true;
    moveStartMillis = millis();
    startRatioValue = brightness * 1.0;
    endRatioValue = goalRatio;
    moveDuration = int(frameDuration * ratioChangeAbs);
    moveDuration = max(1, moveDuration);
    Serial.print("Move details:");
    Serial.print(startRatioValue);
    Serial.print(" to ");
    Serial.print(endRatioValue);
    Serial.print(", ");
    Serial.print(moveDuration);
    Serial.println(" ms");
}

void updateFlower() {
    // Serial.println("update flower");
    if (performingMove) {
        Serial.println("performing move");
        unsigned long currentMillis = millis();
        if (currentMillis - moveStartMillis > moveDuration)
        {
            performingMove = false;
            brightness = endRatioValue;
            int newServoMicros = (servoClosedMicros + int(brightness * (servoOpenMicros - servoClosedMicros)));
            petalServo.write(newServoMicros);
            // petalServo.detach();
            Serial.println("move done");
        }
        else
        {
            brightness = startRatioValue + (endRatioValue - startRatioValue) * (currentMillis - moveStartMillis) / moveDuration;
            Serial.print("new brightness:");
            Serial.println(brightness);
            int newServoMicros = (servoClosedMicros + int(brightness * (servoOpenMicros - servoClosedMicros)));
            petalServo.write(newServoMicros);
        }
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
                if (!performingMove)
                {
                    float newGoalValue = 0;
                    if (brightness < 0.01) {
                        newGoalValue = 1.0;
                    }
                    startMove(newGoalValue);
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

// this function automagically gets called upon a matching POST request
int setOpenValue(String data)
{
    Serial.print("Received cloud value:");
    Serial.println(data);
    Serial.println(data.toInt());
    Serial.println("--");
    int goalValue = max(0, min(data.toInt(), 100));
    float goalRatio = goalValue * 1.0 / 100.0;
    Serial.println(goalRatio);
    Serial.println(brightness);
    startMove(goalRatio);
    Serial.println("returning");
    return 1;
}
