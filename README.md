In a _programmable space_ the concept of a computer is expanded outside a little rectangular screen to fill the entire room.
Interacting with the programmable space means using physical objects, not virtual ones on a screen.
Bringing computing to the scale of a room makes it a communal and social experience.

The idea of a programmable space is an ongoing area of research by [Jacob Haip](http://haiperspace.com/), an independent researcher based in Boston, USA.

- Project Overview
- Gallery
- Setting up your own programmable space
- Getting Involved
- Development Log

---

# Project Overview

Most research so far has used the idea that computer programs have a 1-1 mapping with physical objects.
Physical objects have the source code written/printed on them so people in the room can understand what the code is/does.
There is no use of traditional GUI computer interface: everything is remade in the room.

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
   - Pros: Takes advantage or how common 2D printers are. Programs can be sensed in any orientation
   - Cons: Camera systems had occlusion and lighting issues
2. Printed Source code attached to RFID cards that are placed on RFID sensors.
   - Pros: No occlusion or lighting issues. RFID cards are durable
   - Cons: Relies on fixed grids of RFID sensors that increase costs and can't detect orientation

## Software

The pieces of code with a 1-1 mapping to physical objects run on computers as normal Operating System processes.
Each process connects to a broker that manages communication with the system.
The broker manages the "fact table" and communication between processes.
The processes themselves handle the sensing of physical objects and all other functionality of the system.

The core software idea is that the room has a shared list of "facts" that things within the room use to communicate.

> Fact = Typed list of values that reads like a sentence
>
> ```
> Soil    moisture  is      50.3
> [text]  [text]    [text]  [number]
> ```

> Fact Table = Shared list of all facts from objects in the room
>
> ```
> Fact 1. Soil moisture is 50.3
> Fact 2. Light should be off
> Fact 3. Time is 1600909276
> ```

Programs can update the Fact Table in two ways: Claim or Retract.

> Claim = Add a Fact to the Fact Table
>
> ```
> Claim(Soil moisture is 50.3)
> ```

> Retract = Remove facts matching a pattern from the Fact Table
>
> ```
> // fully specified fact
> Retract(Soil moisture is 50.3)
> // $ is a single wildcard value of any type
> Retract(Soil moisture is $)
> // % is a postfix wilcard that matches until the end of the fact
> Retract(Soil moisture %)
> ```

Programs can listen for changes to the fact table to influence their own actions via Subscriptions.

> Subscription = A program's desire to get updates from the Fact Table about Facts that match a pattern. The pattern is specified as a list of typed lists. Patterns follow Datalog rules where reused variables must match in each result.
>
> Given the fact table
>
> ```
> Fact 1. Sensor sees red
> Fact 2. Light should be off
> Fact 3. red is Jen favorite color
> Fact 4. blue is Smo favorite color
> ```
>
> Example subscriptions and results:
>
> ```
> Light should be $value
> -->
> 1. value = red
> ```
>
> ```
> today is $day
> -->
> No results
> ```
>
> ```
> Light should be off
> -->
> 1. (one result but no values)
> ```
>
> ```
> $color is $person favorite color
> -->
> 1. color = red, person = Jen
> 1. color = blue, person = Smo
> ```
>
> ```
> Sensor sees $color,
> $color is $person favorite color
> -->
> 1. color = red, person = Jen
> ```

The Fact Table is maintained by a broker.

> Broker = Software system that objects and program talk to that manages updates to the Fact Table and informs subscribers about changes. All Claims, Retracts, Subscriptions, and Subscription Results flow through it.

Programs have been implemented in multiple programming languages (Python, Node.js, Golang, Lua, an experiemental custom langauge).

# Gallery

TODO

# Setting up your own programmable space

The software system could theoretically be run in a normal GUI computer interface on a single computer,
but that is contrary to the goal of breaking free the single-screen GUI computer interface.
Because of this, setting up a programmable space means more than just setting it up on your computer.
