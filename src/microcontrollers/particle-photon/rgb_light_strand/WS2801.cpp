//-----------------------------------------------//
// SPARK CORE Adafruit_WS2801 LIBRARY & EXAMPLE  //
//===============================================//
// Copy this into a new application at:          //
// https://www.spark.io/build and go nuts!       //
// Read comments in APPLICATION.CPP section for  //
// Hookup details!                               //
//-----------------------------------------------//
// Technobly / BDub - Jan 9th, 2014              //
//===============================================//

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

/* ========================== Adafruit_WS2801.cpp =========================== */

#include "WS2801.h"

// Example to control WS2801-based RGB LED Modules in a strand or strip
// Written by Adafruit - MIT license
/*****************************************************************************/

// Constructor for use with hardware SPI (specific clock/data pins):
Adafruit_WS2801::Adafruit_WS2801(uint16_t n, uint8_t order) {
  rgb_order = order;
  alloc(n);
  updatePins();
}

// Constructor for use with arbitrary clock/data pins:
Adafruit_WS2801::Adafruit_WS2801(uint16_t n, uint8_t dpin, uint8_t cpin, uint8_t order) {
  rgb_order = order;
  alloc(n);
  updatePins(dpin, cpin);
}

// Constructor for use with a matrix configuration, specify w, h for size of matrix
// assumes configuration where string starts at coordinate 0,0 and continues to w-1,0, w-1,1
// and on to 0,1, 0,2 and on to w-1,2 and so on. Snaking back and forth till the end.
// other function calls with provide access to pixels via an x,y coordinate system
Adafruit_WS2801::Adafruit_WS2801(uint16_t w, uint16_t h, uint8_t dpin, uint8_t cpin, uint8_t order) {
  rgb_order = order;
  updatePins(dpin, cpin);
}

// Allocate 3 bytes per pixel, init to RGB 'off' state:
void Adafruit_WS2801::alloc(uint16_t n) {
  begun   = false;
  numLEDs = ((pixels = (uint8_t *)calloc(n, 3)) != NULL) ? n : 0;
}

// via Michael Vogt/neophob: empty constructor is used when strand length
// isn't known at compile-time; situations where program config might be
// read from internal flash memory or an SD card, or arrive via serial
// command.  If using this constructor, MUST follow up with updateLength()
// and updatePins() to establish the strand length and output pins!
// Also, updateOrder() to change RGB vs GRB order (RGB is default).
Adafruit_WS2801::Adafruit_WS2801(void) {
  begun     = false;
  numLEDs   = 0;
  pixels    = NULL;
  rgb_order = WS2801_RGB;
  updatePins(); // Must assume hardware SPI until pins are set
}

// Release memory (as needed):
Adafruit_WS2801::~Adafruit_WS2801(void) {
  if (pixels != NULL) {
    free(pixels);
  }
}

// Activate hard/soft SPI as appropriate:
void Adafruit_WS2801::begin(void) {
  if(hardwareSPI == true) {
    startSPI();
  } else {
    pinMode(datapin, OUTPUT);
    pinMode(clkpin , OUTPUT);
  }
  begun = true;
}

// Change pin assignments post-constructor, switching to hardware SPI:
void Adafruit_WS2801::updatePins(void) {
  hardwareSPI = true;
  datapin     = clkpin = 0;
  // If begin() was previously invoked, init the SPI hardware now:
  if(begun == true) startSPI();
  // Otherwise, SPI is NOT initted until begin() is explicitly called.

  // Note: any prior clock/data pin directions are left as-is and are
  // NOT restored as inputs!
}

// Change pin assignments post-constructor, using arbitrary pins:
void Adafruit_WS2801::updatePins(uint8_t dpin, uint8_t cpin) {

  if(begun == true) { // If begin() was previously invoked...
    // If previously using hardware SPI, turn that off:
    if(hardwareSPI == true) SPI.end();
    // Regardless, now enable output on 'soft' SPI pins:
    pinMode(dpin, OUTPUT);
    pinMode(cpin, OUTPUT);
  } // Otherwise, pins are not set to outputs until begin() is called.

  // Note: any prior clock/data pin directions are left as-is and are
  // NOT restored as inputs!

  hardwareSPI = false;
  datapin     = dpin;
  clkpin      = cpin;
  ////clkport     = portOutputRegister(digitalPinToPort(cpin));
  ////clkpinmask  = digitalPinToBitMask(cpin);
  ////dataport    = portOutputRegister(digitalPinToPort(dpin));
  ////datapinmask = digitalPinToBitMask(dpin);
}

// Enable SPI hardware and set up protocol details:
void Adafruit_WS2801::startSPI(void) {
    SPI.begin();
    SPI.setBitOrder(MSBFIRST);
    SPI.setDataMode(SPI_MODE0);
    SPI.setClockDivider(SPI_CLOCK_DIV64); // 1 MHz max, else flicker (set to 72MHz/128 = 562.5kHz)
}

uint16_t Adafruit_WS2801::numPixels(void) {
  return numLEDs;
}

// Change strand length (see notes with empty constructor, above):
void Adafruit_WS2801::updateLength(uint16_t n) {
  if(pixels != NULL) free(pixels); // Free existing data (if any)
  // Allocate new data -- note: ALL PIXELS ARE CLEARED
  numLEDs = ((pixels = (uint8_t *)calloc(n, 3)) != NULL) ? n : 0;
  // 'begun' state does not change -- pins retain prior modes
}

// Change RGB data order (see notes with empty constructor, above):
void Adafruit_WS2801::updateOrder(uint8_t order) {
  rgb_order = order;
  // Existing LED data, if any, is NOT reformatted to new data order.
  // Calling function should clear or fill pixel data anew.
}

void Adafruit_WS2801::show(void) {
  uint16_t i, nl3 = numLEDs * 3; // 3 bytes per LED

  for(i=0; i<nl3; i++) {
    SPI.transfer(pixels[i]);
  }

  delay(1); // Data is latched by holding clock pin low for 1 millisecond
}

// Set pixel color from separate 8-bit R, G, B components:
void Adafruit_WS2801::setPixelColor(uint16_t n, uint8_t r, uint8_t g, uint8_t b) {
  if(n < numLEDs) { // Arrays are 0-indexed, thus NOT '<='
    uint8_t *p = &pixels[n * 3];
    // See notes later regarding color order
    if(rgb_order == WS2801_RGB) {
      *p++ = r;
      *p++ = g;
    } else {
      *p++ = g;
      *p++ = r;
    }
    *p++ = b;
  }
}

// Set pixel color from 'packed' 32-bit RGB value:
void Adafruit_WS2801::setPixelColor(uint16_t n, uint32_t c) {
  if(n < numLEDs) { // Arrays are 0-indexed, thus NOT '<='
    uint8_t *p = &pixels[n * 3];
    // To keep the show() loop as simple & fast as possible, the
    // internal color representation is native to different pixel
    // types.  For compatibility with existing code, 'packed' RGB
    // values passed in or out are always 0xRRGGBB order.
    if(rgb_order == WS2801_RGB) {
      *p++ = c >> 16; // Red
      *p++ = c >>  8; // Green
    } else {
      *p++ = c >>  8; // Green
      *p++ = c >> 16; // Red
    }
    *p++ = c;         // Blue
  }
}

// Query color from previously-set pixel (returns packed 32-bit RGB value)
uint32_t Adafruit_WS2801::getPixelColor(uint16_t n) {
  if(n < numLEDs) {
    uint16_t ofs = n * 3;
    // To keep the show() loop as simple & fast as possible, the
    // internal color representation is native to different pixel
    // types.  For compatibility with existing code, 'packed' RGB
    // values passed in or out are always 0xRRGGBB order.
    return (rgb_order == WS2801_RGB) ?
      ((uint32_t)pixels[ofs] << 16) | ((uint16_t) pixels[ofs + 1] <<  8) | pixels[ofs + 2] :
      (pixels[ofs] <<  8) | ((uint32_t)pixels[ofs + 1] << 16) | pixels[ofs + 2];
  }

  return 0; // Pixel # is out of bounds
}
