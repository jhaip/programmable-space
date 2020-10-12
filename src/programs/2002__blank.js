const { room, myId, run } = require('../helper2')(__filename);

const code = `
#include "HttpClient.h"

int lastButtonState = HIGH;

void setup() {
  pinMode(D7, OUTPUT);
  pinMode(D0, INPUT);
}

void loop() {
  int buttonState = digitalRead(D0);
  if (buttonState == HIGH) {
  digitalWrite(D7, HIGH);
  } else {
  digitalWrite(D7, LOW);
  }
  if (lastButtonState == LOW && buttonState == HIGH) {
    char body[300];
    sprintf(body,
      "{\\"claim\\":\\"button was pressed @ %ld\\", "
      "\\"retract\\":\\"$ $ button was pressed @ $\\"}",
      Time.now());
    publishValueMessage(body);
  }
  lastButtonState = buttonState;
}
`
room.assert(`wish`, ["text", code], `runs on the photon`)




run();
