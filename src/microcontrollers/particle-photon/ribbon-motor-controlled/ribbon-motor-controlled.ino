int directionPin = D0;
int pwmPin = D2;
int dutyCycle = 170;
int onTimeMs = 10;
int delayBetweenTicks_ms = 5000;

void tick_motors()
{
    digitalWrite(directionPin, LOW);
    analogWrite(pwmPin, dutyCycle);
    delay(onTimeMs);
    analogWrite(pwmPin, 0);
}

Timer timer(delayBetweenTicks_ms, tick_motors);

void setup()
{
    bool successAttachingSetDelayValue = Particle.function("setDelayValue", setDelayValue);
    pinMode(directionPin, OUTPUT);
    pinMode(pwmPin, OUTPUT);
    timer.start();
}

int setDelayValue(String data)
{
    Serial.print("Received cloud value:");
    Serial.println(data);
    Serial.println("--");
    delayBetweenTicks_ms = data.toInt();
    timer.changePeriod(delayBetweenTicks_ms);
    return 1;
}
