// Copyright Benoit Blanchon 2014
// MIT License
//
// Arduino JSON library
// https://github.com/bblanchon/ArduinoJson

#pragma once

#include "JsonVariant.h"

namespace ArduinoJson {

// A key value pair for JsonObject.
struct JsonPair {
  const char* key;
  JsonVariant value;
};
}
