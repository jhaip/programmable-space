#pragma once

#ifndef SPARK

#include <stddef.h>
#include <stdint.h>

// This class reproduces Arduino's Print
class Print {
 public:
  virtual ~Print() {}

  virtual size_t write(uint8_t) = 0;

  size_t print(const char[]);
  size_t print(double, int = 2);
  size_t print(long);
  size_t println();
};

#else

#include <application.h>

#endif
