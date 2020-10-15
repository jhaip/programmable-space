## Editing Source Code

The ability to edit the source code of programs running in the room is one of the key ideas because it allows the programmable space to be improved using the
programmable space itself. In this example we'll use we using the "papers with colored dots" method of sensing with textual source code that is edited directly. Program #1013 in the room is the "text editor". It displays and shows a text editor interface for whatever program that is above it in the room. Program #1013 does not interact with the host operating system at all (those tasks are handled by other programs as described below), so making alternative editing interfaces is pretty easy. The entire text editor is only 300 lines of code!

**Program #1013 - Text Editor:**

Subscriptions:

- Get source code of the program the text editor is pointing at and the text editor's size:
  ```
  paper 1013 is pointing at paper $targetId,
  $targetName has paper ID $targetId,
  $targetName has source code $sourceCode,
  paper 1013 has width $myWidth height $myHeight angle $ at ( $ , $ )
  ```
  - #277 claims which papers are pointing at each other. This depends on #1601 to do the paper detection and tracking.
  - #390 claims what papers and source codes are in the system at boot
  - #577 claims facts about new source codes when programs are edited
  - #620 calculates a simple width, height, position, and angle based on the raw #1601 paper detection.
- Keyboard input:
  ```
  keyboard $ typed key $key @ $t
  ```
  and
  ```
  keyboard $ typed special key $specialKey @ $t
  ```
  - #648 listens for keyboard events on the host operating system and claims them to the room as facts

Claims:

- `wish {targetName} has source code {updated source code}`
  - Subscribed to by #577 to claim the new source code. #577 causes #40 to compile the code and edit the file for the program on the host operating system.
- `wish {targetName} would be running` (Retract then claim)
  - Subscribed to by #1900 to restart the program on the host operating system after the source code was edited
- `wish a paper would be created in {language} with source code {code} @ {currentTime}`
  - Subscribed to by #1459 which create the needed files on the host operating system and make the claims about the new program similar to #390 during boot.
- `wish paper {targetID} at {targetName} would be printed`
  - Subscribed to by #1382 which creates a PDF of the updated source code. #1382 makes a claim that #498 subscribes to that causes this PDF to be printed on a printer in the room.
- `draw graphics {serializedGraphics} on 1013`
  - Subscribed to by #1999 which renders the graphics needed to be projection mapping on top of the #1013 program in the room.
