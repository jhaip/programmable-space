# Growing a Space

## Basics

ArUco camera vision using a web browser on a computer monitor as output.

### Hello World
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

### Turtlebot simulation
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