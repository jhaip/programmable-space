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

- #1601 Grab frames from webcam, process them, and claim facts about what programs are seen in the room

**Editing papers:**

- #577 Program Editor - Subscribes to facts about changes to source code and makes the corresponding changes to the files on the host OS
- #1459 Create new program - Subscribes to facts about creating new papers and creates the new source code files on the host OS
- #40 Custom JavaScript compiler - A simple compiler that transforms program source code into JavaScript source code that can be run on the host OS

**Printing**

- #498 Printing Manager - Subscribes to facts about files on the host OS being printed and sends the job to the printer
- #1382 Print Paper - Subscribes to facts about a particular program being printed and generates a PDF file that can be printed by #498

**Display**

- #1999 Lua graphics manager - Subscribes to facts about graphical displays and draws them in a fullscreen window on the host OS

**Keyboard Input**

- #648 - Listens for OS keyboard events and claims them to the room as a fact

**Debug**

- #10 - A live view of the entire contents of the broker's fact table
- #11 Latency measurment - Measures the round trip time of claiming a fact and receiving a subscription notification about it

**Protocol Adapters**

- #20 - Accepts HTTP POST messages about claims and retracts and forwards them to the broker
