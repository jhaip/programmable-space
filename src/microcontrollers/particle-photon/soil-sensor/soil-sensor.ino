// This #include statement was automatically added by the Particle IDE.
#include <Adafruit_Seesaw.h>

Adafruit_Seesaw ss;

void setup()
{
  Serial.begin(115200);

  while (!Serial)
  {
    delay(10);
  }

  Serial.println("seesaw Soil Sensor example!");

  if (!ss.begin(0x36))
  {
    Serial.println("ERROR! seesaw not found");
    while (1)
      ;
  }
  else
  {
    Serial.print("seesaw started! version: ");
    Serial.println(ss.getVersion(), HEX);
  }
}

int last_x = 0, last_y = 0;

void loop()
{
  uint16_t tempC = ss.getTemp();
  uint16_t capread = ss.touchRead(0);

  Serial.print("Temperature: ");
  Serial.print(tempC);
  Serial.println("*C");
  Serial.print("Capacitive: ");
  Serial.println(capread);
  // delay(100);
  
  Particle.publish("TestSensor", "SOIL_TEMP:"+ String(tempC));
  Particle.publish("TestSensor", "SOIL_MOISTURE:"+ String(capread));
  delay(2000);
}
