In a *programmable space* the concept of a computer is expanded outside a little rectangular screen to fill the entire room.
Interacting with the programmable space means using physical objects, not virtual ones on a screen.
Bringing computing to the scale of a room makes it a communal and social experience.

The idea of a programmable space is an ongoing area of research by [Jacob Haip](http://haiperspace.com/), an independent researcher based in Boston, USA.

* Project Overview
* Gallery
* Setting up your own programmable space
* Getting Involved
* Development Log

---

# Project Overview

Most research so far has used the idea that computer programs have a 1-1 mapping with physical objects.
Physical objects have the source code written/printed on them so people in the room can understand what the code is/does.
No use of traditional GUI computer interface: everything is remade in the room.

The programmable space is two important concepts:
1. What the physical objects are, how people interact with them, and how they can be used as inputs to the system
2. The specific technical implementation that brings the system to life and defines the semantics of the code, what is possible for people in a programmable space, and how it can be implemented on existing computer systems.

Although this is a Github project and software systems are important to the project implementation, I should be clear this is not a "software project".
The research goals of this project are to experience the physical side and the software implementation is just necessary step in the prototype.

## Physical objects

Research so far has used the idea that textual/graphical code is printed on physical objects in the room.
Although the project research explores more physical ways to make and mold systems, I don't imagine a world that is totally free of text
and building on existing programming languages is a convenient starting point.

Therefore there are two main types of physical objects:
1. Physical representation of code
2. Auxillary physical objects used to make the system more tangible: motors, sensors, game controllers, keyboards, printers, ...

Two types of physical representations of code have been tested:
1. Source code printed on paper with colored dots in the corners that can be identified and tracked using computer vision.
    * Pros: Takes advantage or how common 2D printers are. Programs can be sensed in any orientation
    * Cons: Camera systems had occlusion and lighting issues
2. Printed Source code attached to RFID cards that are placed on RFID sensors.
    * Pros: No occlusion or lighting issues. RFID cards are durable
    * Cons: Relies on fixed grids of RFID sensors that increase costs and can't detect orientation

## Software

TODO

# Gallery

TODO

# Setting up your own programmable space

The software system could theoretically be run in a normal GUI computer interface on a single computer,
but that is contrary to the goal of breaking free the single-screen GUI computer interface.
Because of this, setting up a programmable space means more than just setting it up on your computer.
