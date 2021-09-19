# Growing a Space

## Basic Starting Point

ArUco camera vision using a web browser on a computer monitor as output.

#### Demo: Hello World
- Create a new program using the 1014 web editor at `localhost:3020`
- Put in this code:
  ```
  const { room, myId, run } = require('../helpers/helper')(__filename);

  let ill = room.newIllumination()
  ill.fontcolor(255, 0, 0);
  ill.text(0, 0, "Hello World!")
  room.draw(ill);

  run();
  ```
- Save
- Print out an ArUco ID and tape it to a paper. Write "hello world" on it. You'll need to know the ID of the aruco card.
- Open `localhost:3023` to associate the aruco card ID to the program you just created.
- Now when you place your card on the desk, it should show hello world. When you remove the card, it shows it.

#### Demo: Turtlebot simulation
- Add ArUco cards for:
    - 122 turtlebot simulation
    - 2030 Turtle card
    - 2034 Rainbow card
    - 2036 Emitter card
    - 2035 Spiral card
    - 2033 Pen card
- Run card 1246 web graphics

A simple simulation where the turtlebots behavior is controlled
by the cards placed on the desk. Placing just the Turtle card on the desk
will show a turtlebot randomly wandering on the screen. At most,
laying out the emitter, turtle, pen, spiral, and rainbow in a line will
cause a stream of turtlebots to leave a rainbow path behind.
Different combinations of cards produce different effects.

## Extension: Projected Augmented Reality

Adding a projector allows the graphical output to be projected on the physical programs on the table. This jump makes the programs feel like real objects rather than just a way to turn on/off programs physically.

**Additional Setup Required:**

1. Setup a projector. If you are using a table-based setup then that involves figuring out how to mount a projector vertically down. Throw ratios are important when figuring out how far the projector needs to be mounted away to achieve a certain image size. The view of the webcam should be larger than the projected region for calibration.
2. Add programs and perform calibrations for camera->projector calibration.

**Demos:**

* Dynamic Photobook
* Hand-drawn animations

## Extension: Making Electronic Devices via CircuitPython

Add physical objects as inputs/outputs into the programmable space. Have button presses be inputs. Have motors be physical outputs from the space. Make custom and unique objects that integrate with the space.

**Additional Setup Required:**

* Make the program detecting stand
* Buy CircuitPython boards like Raspberry Pi Pico, Adafruit CLUE

**Things you can make:**

- Activity tracker
- plant sensor + dashboard
- lights on bookshelf for searching
- button to save picture of desk
- RFID card inputs
- ...lots of things

## Extension: Laser Pointer Regions

Use a laser pointer as the equivalent of a wireless mouse cursor of the room. My favorite way to make existing objects on walls (posters, maps, calendars, ...) interactive.

**Things you can make:**

- Musical posters
- Restaurant map
- Calendar input
- Running map

## Extension: Dot-Paper Detection

TODO