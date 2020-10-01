In a _programmable space_ the concept of a computer is expanded outside a little rectangular screen to fill the entire room.
Interacting with the programmable space means using physical objects, not virtual ones on a screen.
Bringing computing to the scale of a room makes it a communal and social experience.

The idea of a programmable space is an ongoing area of research by [Jacob Haip](http://haiperspace.com/), an independent researcher based in Boston, USA.

- [Backstory](#backstory)
- [Project Overview](#project-overview)
- [Gallery](#gallery)
- [Setting up your own programmable space](#setting-up-your-own-programmable-space)
- [Getting Involved](#getting-involved)
- Development Log

---

# Backstory

Today people can do almost everything on a computer, but "using a computer" means everyone stares at apps on their own little rectangular screens. This is sad because it makes people tired of screens, antisocial, reduces people to button clicks, and convinces people that they "aren't good with computers".

How can we change the affordances of using a computer so that they are more humane and inviting?
Computers demand all your foreground attention in a fixed position. How can we take advantage of periphery senses and the full body capability of people?
Computer GUIs cram so much information in screens behind layers of menus and pages when there is so much space in the world! How can we take advantage of all the space in the room?
People consume apps and don't feel empowered to do much besides download a better app. In some ways this makes sense when the barrier to making something new is so formal. How can we make editing the tools you use a normal and easy part of using a computer?

We explore these ideas in a long term research project under the name "programmable spaces". We seek to create a system that is:

- Gradual
- Room-scale
- Multiplayer-social
- Always-on
- Editable and understandable

# Project Overview

Most research so far has used the idea that computer programs have a 1-1 mapping with physical objects.
Physical objects have the source code written/printed on them so people in the room can understand what the code is/does.
There is no use of traditional GUI computer interface: everything is remade in the room.

[Click here to see an example of a minimal programmable space](https://haiperspace.com/writing/20-02-11-rfid-cards/) that uses RFID cards as the physical representation of programs.

The programmable space is the combination of two parts:

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

### 1. Papers with Colored Dots on corners

![Paper dot sensing diagram](/doc/paper-dot-sensing.png?raw=true)

Inspired by the papers of [Dynamicland](https://dynamicland.org/), programs are represented by pieces of paper with
source code and colored dots printed on it. The printed source code is so people in the room can understand what the program does.
The colored dots are so a camera and computer system can identify and understand what the program does.

Each paper has four sets of colored dots in each corner. Four different colors are used along with seven dots per corner.
Each corner can uniquely identify the papers, but 3 or 4 corners are needed to get the size and orientation of a paper.
A program takes in webcam images, processes them with OpenCV, and then claims what and where papers are located in the room.

The middle of the paper is also a nice canvas for projecting graphics onto the paper.
The projector and camera can be calibrated together to enable projection mapping wherever papers are put in the room.
Having a mini display for every program is fun and helpful.

- **Pros**: Takes advantage of how common 2D printers are. Programs can be sensed in any orientation. Papers can be cut and made different sizes. Support dynamic projection mapping well.
- **Cons**: Camera systems have occlusion and lighting issues.

### 2. RFID cards with printed source code.

![RFID card sensing diagram](/doc/rfid-sensing.png?raw=true)

Programs are represented by standard RFID cards with printed source code attached to it.
Most commonly, I have [printed source code using a receipt thermal printer](https://haiperspace.com/writing/20-02-11-rfid-cards/)
and used a plastic trading card case to hold both the RFID card and the receipt paper.
Another variant I have tried is [taping RFID cards to the back of clipboards](https://haiperspace.com/writing/19-03-17-programmable-space/) that hold full size papers with printed source code.

The RFID cards are sensed by RFID readers. RFID sensors can only sense one card at a time and cards must be placed
directly on top of the sensor so a separate sensor is needed for every place a program can be placed.
For example, two [RFID sensors](https://vetco.net/products/rfid-reader-writer-module-for-arduino-d40?gclid=EAIaIQobChMIysHuremK7AIVmoTICh0sgganEAQYAiABEgKCMPD_BwE) can be hidden behind an [angled photo frame](https://www.dollartree.com/special-moments-freestanding-borderless-horizontal-plastic-photo-frames-6x4-in/225398):

![code stand](https://haiperspace.com/writing/20-02-11-rfid-cards/rfid-card-cover.png)

- **Pros**: No occlusion or lighting issues. RFID cards are durable. Trading card size is nice to hold.
- **Cons**: Can't detect orientation. Cards can only be placed on the fixed locations of RFID sensors.
  More expensive to scale. Projection mapping requires more calibration.

## Software

Behind the scenes, the pieces of code with a 1-1 mapping to physical objects run on computers as normal Operating System processes.
Users do not use a normal computer GUI directly, and so many low-level actions such as running programs, editing programs, printing,
graphical displays, sound, etc. are remade in the physical context of the room.
There is a core group of "boot programs" that are still programs that live physically in the room, but form the "Operating System"
layer that support all the other programs in the room.

Each process connects to a broker that manages communication with the system.
The broker manages the "fact table" and communication between processes.
The processes themselves handle the sensing of physical objects and all other functionality of the system.

The core software idea is that the room has a shared list of "facts" that things within the room use to communicate.

**_Fact_** = Typed list of values that reads like a sentence

```
Soil    moisture  is      50.3
[text]  [text]    [text]  [number]
```

**_Fact Table_** = Shared list of all facts from objects in the room

```
Fact 1. Soil moisture is 50.3
Fact 2. Light should be off
Fact 3. Time is 1600909276
```

Programs can update the Fact Table in two ways: Claim or Retract.

**_Claim_** = Add a Fact to the Fact Table

```
Claim(Soil moisture is 50.3)
```

**_Retract_** = Remove facts matching a pattern from the Fact Table

```
// fully specified fact
Retract(Soil moisture is 50.3)
// $ is a single wildcard value of any type
Retract(Soil moisture is $)
// % is a postfix wilcard that matches until the end of the fact
Retract(Soil moisture %)
```

Programs can listen for changes to the fact table to influence their own actions via Subscriptions.

**_Subscription_** = A program's desire to get updates from the Fact Table about Facts that match a pattern. The pattern is specified as a list of typed lists. Patterns follow Datalog rules where reused variables must match in each result.

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

**_Broker_** = Software system that objects and program talk to that manages updates to the Fact Table and informs subscribers about changes. All Claims, Retracts, Subscriptions, and Subscription Results flow through it.

The Broker also performs helpful things like

1. Saving a prior history of facts for new subscribers
2. Performance intensive code to handle pub/sub
3. Consolidating Datalog query logic

The shared fact table is used as a communication mechanism between programs for this project because it:

- Allows the people writing programs to claims facts and subscriptions that read closer to a sentence.
- Allows programs to communicate asyncronously without needing to know about other programs.
- Maps well to the idea that programs in the same physical space share common knowledge.

When a program is stopped, all the facts and subscriptions is made in the shared fact table are removed. This keeps the shared fact table relevant only the programs that are currently visible in the room and running. Additionally all facts in the shared fact table record what program claimed the fact so the same fact claimed by two different programs is considered two unique facts.

The broker should be "local" to the programs in the room and only serve about as many programs that can fit in a single "space" or "room". For larger spaces or to connect multiple rooms together, facts can be explicitly shared to other brokers and computers. In this way data and programs are federated. Federation is useful both technically (because a single server cannot hold all the facts in the universe) and to aid in the understanding of the people working in a space. For example the position of a paper on a table is very important to someone reading the paper at the same table, but the position of a paper in a different room is irrelevant unless the person at the table as some special reason they care about something going on somewhere else.

Programs have been implemented in multiple programming languages (Python, Node.js, Golang, Lua, an experiemental custom langauge).
The bidirectional communiation between programs and the broker is handled via ZeroMQ TCP sockets (ROUTER/DEALER pattern).

## Bootstrapping

When booting the system, four processes are started manually on the host computer:

1. Broker
2. #390 Initial program code - Scan local files and claims what programs are present and what their current source codes are
3. #1900 Process manager - Handles starting and stopping processes on the host operating system based on facts like "wish #500 would be running"
4. #826 Run seen programs - Listens for facts about programs that where detect in the room and claims "wish X would be running"

With these four processes, all other programs can be started through claims.

There are some core programs for sending programs, editing programs, printing, debugging, keyboard input, and graphics
that are needed to get the system to a level where all other programs can be made physically in the room without directly interacting with a computer.
These programs are started by the `0__boot.js` program that is also started when booting the system:

**Paper dot program detection:**
* #1601 Grab frames from webcam, process them, and claim facts about what programs are seen in the room

**Editing papers:**
* #577 Program Editor - Subscribes to facts about changes to source code and makes the corresponding changes to the files on the host OS
* #1459 Create new program - Subscribes to facts about creating new papers and creates the new source code files on the host OS
* #40 Custom JavaScript compiler - A simple compiler that transforms program source code into JavaScript source code that can be run on the host OS

**Printing**
* #498 Printing Manager - Subscribes to facts about files on the host OS being printed and sends the job to the printer
* #1382 Print Paper - Subscribes to facts about a particular program being printed and generates a PDF file that can be printed by #498

**Display**
* #1999 Lua graphics manager - Subscribes to facts about graphical displays and draws them in a fullscreen window on the host OS

**Keyboard Input**
* #648 - Listens for OS keyboard events and claims them to the room as a fact

**Debug**
* #10 - A live view of the entire contents of the broker's fact table
* #11 Latency measurment - Measures the round trip time of claiming a fact and receiving a subscription notification about it

**Protocol Adapters**
* #20 - Accepts HTTP POST messages about claims and retracts and forwards them to the broker

# Gallery

- [Musical Posters](https://twitter.com/jhaip/status/1299815186493300740). 2020-08-29
- [Voice Assistant reimagined](https://vimeo.com/438758942). 2020-07-15
- [Recreation of the "Dangling String"](https://twitter.com/jhaip/status/1246211983269126146). 2020-04-03
- [Calendar on wall and input and output using laser pointer and projector desk lamp](https://vimeo.com/400827615). 2020-03-25
- [Turtlebot simulation using cards as input parameters](https://vimeo.com/391765260). 2020-03-10
- [Desk lamp with projector inside used as output](https://vimeo.com/391765260). 2020-02-16.
- [Programs represented by RFID Cards and receipt paper](https://haiperspace.com/writing/20-02-11-rfid-cards/). 2020-02-11
- [Animated drawing from papers on desk](https://twitter.com/jhaip/status/1177193544240508928). 2019-09-26
- [Defining and interacting with regions on wall with a laser pointer](https://haiperspace.com/writing/19-09-08-physical-programming/#laser-regions). 2019-09-08
- [Non-textual programming of robots](https://haiperspace.com/writing/19-09-08-physical-programming/#text-free-robot-programming). 2019-09-08
- [Using spatial arrangement of dot papers](https://haiperspace.com/writing/19-09-08-physical-programming/#spatial-awareness). 2019-09-08
- [Putting code onto microcontrollers](https://haiperspace.com/writing/19-03-17-programmable-space/). 2019-03-17
- [Programs represented by RFID Clipboards](https://haiperspace.com/writing/19-03-17-programmable-space/). 2019-03-17
- [Fixed 3x3 grid of programs + text editor](http://haiperspace.com/writing/19-01-20-research-update/). Projected on wall but no camera sensing. 2019-01-20

# Setting up your own programmable space

Every space is different and should be built to fit the needs, experience, and goals of the people that work within it. The room is not an app you download and run, but something that should be built by you. But spaces do have similar baseline needs:

- A way for humans and computers to understand what programs are running and which are not.
- Some sort of display that running programs can use for visual feedback
- A way to edit programs and create new programs

After deciding on a way people will know what programs and running and which are not, an appropriate sensor can be chosen to detect that. For example if a program is represented by a piece of paper with code on it, then a running program could be when it is face-up and visible to everyone in the room. A sensor that could be used to detect face-up papers is a camera.

The easiest way of physically representing code is with papers with colored dots so I recommend starting there.
This guide will assume you have a webcam and a projector to do projection mapping, but you could use a webcam
and an alternative display like a computer monitor if you don't have a projector.
A more immersive experience can be made by putting the cameras and projectors in the ceiling, but to
begin with I'll assume you are pointing the projector and camera at a wall. A magnetic whiteboard is a nice way
to attach papers to the wall, but I have also used rolled painter's tape.

Programs are represented physically as papers with code written on them. When a paper is face-up, showing the code, then it is running. A camera is used as a sensor. Papers are marked with patterns of colored dots in their corners for identification. A camera frame can be process to figure out where the dots are, what papers they correspond to, and therefore where papers are visible in the space.
A projector displays graphics on the programs as the running programs instruct them to.

## Bill of Materials

1. A computer. Preferrably running Ubuntu but I have also done some work on MacOS. It could be a cloud server but for things that happen locally to a room it makes a little more sense to keep the networking local.

   - Currently I'm using a Intel NUC mini PC with 16 GB RAM, a quad-core Intel i5 at 1.30GHz, and a SSD. 16 GB RAM seems to be excessive in my tests but having multiple cores are important when many programs are running.

2. For camera sensing of papers: a webcam. I use the [Logitech C922](https://www.logitech.com/en-us/product/c922-pro-stream-webcam) to get HD video at 30fps.

   - Some way to mount the webcam

3. When using a projector as a display: Any projector should work but HD projectors are nice when projecting small text. Projectors with higher lumens will make the projected graphics more visible in daylight. I used the [Epson Home Cinema 1060](https://www.amazon.com/Epson-Cinema-brightness-speakers-projector/dp/B073S4TS4G/) when projecting across the room and the [Optima GT1080 short throw projector](https://www.amazon.com/Optoma-GT1080Darbee-Lumens-Gaming-Projector/dp/B06XHG92Y5/) when projecting down at a coffee table or the ground.

   - Some way to mount the projector

4. A generic color 2D printer

5. Magnetic whiteboard or painters tape to attach papers to the wall

6. A computer monitor or TV as a supplemental display.
   - A monitor is useful when starting the computer and when debugging
   - I use a TV as a supplemental display. Best used to display one thing as a time in full screen, such as a text editor. TVs and monitors are less immersive than projection, but they can be useful when used as a pure display and not as the screen for a computer's operating system.

Arrange the webcam and projector so that the webcam can see all of the projection area and a little more.

## Software Requirements

Operating system:

- Tested with Ubuntu 16.04
- Partial tests with MacOS High Sierra

Golang:

- For the broker and a few core programs
- [Golang 1.12](https://golang.org/)
- Dependencies are tracked in the `go.mod` file and will be automatically downloaded and installed when running a Go program for the first time.
- When building the Go files, you may need to copy the `new-backend/go-server/go.mod` and `new-backend/go-server/go.sum` files to the root folder of this repo in order for the `src/standalone_processes` Go files to be build properly.

Node.js:

- Used for boot programs and most regular programs
- [Node.js v10.6.0](https://nodejs.org/en/download/package-manager/)
- `npm install`

Python:

- Used for some boot programs and some special regular programs that have nicer Python libaries than Node.js libraries
- [Python 3.5+](https://www.python.org/downloads/)
- `pip3 install -r requirements.txt`
- For camera sensing: [OpenCV 3.4](https://opencv.org/)
- For UI of `1600` and `1700`: [wxPython4](https://wxpython.org/)
- For playing MIDI sounds `777` and capturing keyboard input `648` [pyGame 1.9.5+](https://www.pygame.org)

Lua/Love2D:

- Used for graphical output `src/lua/graphics_test/main.lua`
- `sudo apt install lua5.1`
- `sudo apt install love` (for love 2d)
- `sudo apt install luarocks`
- `sudo apt install libzmq3-dev`
- Install https://github.com/zeromq/lzmq
  - `sudo luarocks install lua-llthreads2`
  - `sudo luarocks install lzmq`
- `sudo luarocks install uuid`

Printing Papers:

- [`lpr`](http://man7.org/linux/man-pages/man1/lpr.1.html) with a default printer configured.

For moving windows around programmatically `sudo apt install xdotool` is needed.

> When installing on a Raspberry Pi these addition things may need to be installed when running the computer vision:
>
> ```
> sudo apt-get install libhdf5-dev
> sudo apt-get install libhdf5-serial-dev
>
> sudo apt-get install libcblas-dev
> sudo apt-get install libatlas-base-dev
> sudo apt-get install libjasper-dev
> sudo apt-get install libqtgui4
> sudo apt-get install libqt4-test
>
> sudo apt-get install libczmq-dev
> sudo apt-get install libqtgui4
> ```

## Starting the broker, boot programs, and sensing programs

**Starting the broker**:

- Run `./jig start`
  - This starts the broker and `0__boot.js`

**Paper sensing**:

1. Grab a frame from the webcam and find everything that looks like a dot (#1600)
2. Get the list of dots and figure out what papers they map to using the knowledge that papers have only certains patterns of dots in the four corners of a paper (#1800)
3. Get the list of visual papers and wish that the corresponding program stored on a computer was running. (#826)
4. Get all wishes for programs that should be running and run them on a computer. (#1900)

**Projection**:

1. A process listens for the locations of all papers and each papers wishes for graphics to be drawn on them. Additionally it listens for a projector-camera calibration so the display is able to perform the projection mapping. (`src/lua/graphics_test/main.lua`)

**Program editing**:

To edit and create programs, there is a special piece of paper that edits the code of whatever paper it is pointing at. The code being edited is projected on to the text editor paper. A wireless keyboard associated with the text editor edits the text. When a new version of code is saved, a new version of the paper is printed out of a new sheet of paper to replace the old piece of paper.

1. The input from a wireless keyboard is captured and claimed to the room (#648)
2. When the system starts, a program reads the contents of all code files and claims them to the room (#390)
3. The text editor paper (#1013):
   a. Gets the source of the program it is editing
   b. Listens for the latest key presses to control the text editor cursor
   c. Wishes the text editor graphics would be projected on it
   d. When saving a program, the text editor wishes some other process would persist the new source code
4. A program listens for wishes of edited programs, transforms the code from the room's domain specific language into, and then wishes that the files on disk would be edited and run (#40). Another program persists the changes to the source code to the computer's disk (#577) and then causes the process to be restarted (#1900).
5. Simultaneously when saving a program, another program generates a PDF of a new piece of paper (#1382) and then another program talks to the printer to print the PDF (#498).

#### Projection mapping calibration

Open `1600`'s desktop application. Press `1` and then click on the top left corner of the projection region.
Repeat for `2`, `3`, and `4` in a clock-wise order. Press ` to stop editing corners.

# Getting Involved

As this is an informal and long-term research project, we invite everyone to make their own programmable spaces and share their thoughts.
A programmable space is not an application that can just be downloaded to a computer, but this Github repository
contains a broker and an example set of programs that is a good starting point for your own programmable space.
There are many technical changes and areas where this repositories broker and example programs could be improved - make
a fork of this repository and make pull requests if you would like to suggest an improvement.

An even more important way to contribute to this project is to build a programmable space system that is valuable to
you and the people that share your space and to share your findings.
What were people empowered to do?
What new types of challenges were found in trying to move a computer system into the physical world?
What types of edits and usage cases were valuable to the people in your space?
