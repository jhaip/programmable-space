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

![Hello World Demo](hello_world_aruco.gif)

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

![Turtlebot Demo](demo-turtlebot.jpg)

![Turtlebot Demo Cards](demo-turtlebot-cards.jpg)

## Extension: Projected Augmented Reality

Adding a projector allows the graphical output to be projected on the physical programs on the table. This jump makes the programs feel like real objects rather than just a way to turn on/off programs physically.

**Additional Setup Required:**

1. Setup a projector. If you are using a table-based setup then that involves figuring out how to mount a projector vertically down. Throw ratios are important when figuring out how far the projector needs to be mounted away to achieve a certain image size. The view of the webcam should be larger than the projected region for calibration.
2. Add ArUco cards for:
    - 286 calculate homography from projector calibration
    - 1625 web projector-camera calibration
    - 430 Maps a programming drawing on "themselves" to associated graphical output. Important when there are multiple graphical outputs.
    - 620 Claim simplified program details like width, angle, etc. Mainly for convenience.
    - ![Projected AR Cards](cards-projected-ar.jpg)
3. Do projector calibration. Open localhost:3021 and select the corners of the projector's output using (1) for the top left (2) for the top right (3) for the bottom right (4) for the bottom left.
    - TODO: add screenshot
4. Add a programs that draws on itself like this:
    - ```
      let ill = room.newIllumination();
      ill.fontsize(300);
      ill.fontcolor("white");
      ill.text(0, 0, `Hello World!`);
      room.draw(ill);
      ```
    - TODO: add picture


**Demos:**

- Dynamic Photobook
- Hand-drawn animations
- Editing Papers on the Desk
  - Add ArUco cards for:
    - 277 pointing at (Figures out with programs are "above" each other and claims that to the room)
    - 1013 text editor
    - 650 keyboard proxy (Listens for keyboard presses and claims them to the room)
  - When you place a program above the 1013 text editor then you should see
    the program's source code projected.

## Extension: Making Electronic Devices via CircuitPython

Add physical objects as inputs/outputs into the programmable space. Have button presses be inputs. Have motors be physical outputs from the space. Make custom and unique objects that integrate with the space.

**Additional Setup Required:**

* Make the program detecting stand
* Buy CircuitPython boards like Raspberry Pi Pico, Adafruit CLUE

![CircuitPython Editor Cards](cards-circuitpy-editor.jpg)

**Things you can make:**

- Activity tracker
- plant sensor + dashboard
- lights on bookshelf for searching
- button to save picture of desk
- RFID card inputs
- ...lots of things

## Extension: Laser Pointer Regions

Use a laser pointer as the equivalent of a wireless mouse cursor of the room. My favorite way to make existing objects on walls (posters, maps, calendars, ...) interactive.

**Additional Setup Required:**

* Get another webcam, a red gel filter, and a laser pointer with a red laser, and another computer
  * I am using the Logitech C920 webcam, [red gel filters/transparencies](https://www.amazon.com/Pangda-Colored-Overlays-Correction-Transparent/dp/B073XJMS39?psc=1),  and [this combination laser pointer with keyboard shortcuts](https://www.amazon.com/KNORVAY-Laser-Presentation-Hyperlink-PowerPoint/dp/B00XVW6UJO), and a Raspberry Pi 4 computer.
  * By taping the red gel filter and turning the exposure setting of the webcam down very low, most visible light is filtered out except the bright red right from a laser pointer. A simple OpenCV program thresholds the image and claims all bright blobs as laser pointer cursors in the room.
  * ![Webcam and Laser Pointer](laser-cv-webcam.jpg)
* Depends on all the cards from the projected AR extension
* Projector and camera nees to be calibrated. 
  * I usually do this by shining the laser at a corner, refreshing the web project calibration page to save that frame, and then clicking on corner.
* Additionally, add cards for:
  * 285 state manager for making new regions
  * 12 web debug program for regions. Also used as the UI to make new regions
  * 1911 draw a "cursor" where the laser pointer is
  * 281 claim when laser cursor is inside a region
  * 283 helper program to highlight regions
  * 287 helper to calculation the transform so you can project map graphics onto a specific region
  * ![Laser Regions Cards](cards-laser-region.jpg)
* The computer should run the 1901 program after booting
* Make an card for 1902 and run claim something like this to setup the other computer:
  * ```
    pkill -f "processing/graphics"
    pkill -f "python3"
    v4l2-ctl \
      --set-ctrl=brightness=10 \
      --set-ctrl=contrast=0 \
      --set-ctrl=saturation=-100 \
      --set-ctrl=sharpness=128 \
      --set-ctrl=exposure_absolute=50
    export DISPLAY=:0
    export PROG_SPACE_SERVER_URL="XXX.XXX.X.XX"
    python3 src/programs/1620__seeLaser.py 1998 &
    /home/pi/processing-3.5.3/processing-java --output=/tmp/processing/ --sketch=src/processing/graphics --force --present 1998
    ```

**Things you can make:**

- Musical posters
- Restaurant map
- Calendar input
- Running map

## Extension: Dot-Paper Detection

TODO