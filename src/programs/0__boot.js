const execFile = require('child_process').execFile;
const execFileSync = require('child_process').execFileSync;
const { room, myId, scriptName, run } = require('../helper2')(__filename);

/*** Start the program that can start all other programs ***/
console.error("pre--------DONE WITH INITIAL PROGRAM CODE")
const child0 = execFileSync(
  'node',
  [`src/standalone_processes/390__initialProgramCode.js`]
);
console.error("DONE WITH INITIAL PROGRAM CODE")
const child = execFile(
  'node',
  [`src/standalone_processes/1900__processManager.js`],
  (error, stdout, stderr) => {
    if (error) {
        console.error('stderr', stderr);
        console.error(error);
    }
    console.log('stdout', stdout);
});


/*** Start the programs that actually starts all boot programs ***/
room.assert(`camera 99 sees paper 1900 at TL (1, 1) TR (2, 1) BR (2, 2) BL (1, 2) @ 1`)
room.assert('wish 1900 would be running')
room.assert('wish 826 would be running')
// room.assert('wish "390__initialProgramCode.js" would be running')

/*** Initial boot values ***/

/*** Claim that a (fake) camera can see all boot papers ***/
// Initial Program Code:
// room.assert(`camera 1 sees paper 390 at TL (1, 1) TR (2, 1) BR (2, 2) BL (1, 2) @ 1`)
// Printing Manager:
room.assert(`camera 99 sees paper 498 at TL (1, 1) TR (2, 1) BR (2, 2) BL (1, 2) @ 1`)
// Program Editor (may not be needed now?)
room.assert(`camera 99 sees paper 577 at TL (1, 1) TR (2, 1) BR (2, 2) BL (1, 2) @ 1`)
// Run Seen Papers
room.assert(`camera 99 sees paper 826 at TL (1, 1) TR (2, 1) BR (2, 2) BL (1, 2) @ 1`)
// Paper Details
room.assert(`camera 99 sees paper 620 at TL (1, 1) TR (2, 1) BR (2, 2) BL (1, 2) @ 1`)
// Create New Paper
room.assert(`camera 99 sees paper 1459 at TL (1, 1) TR (2, 1) BR (2, 2) BL (1, 2) @ 1`)
// Dots to papers
room.assert(`camera 99 sees paper 1800 at TL (1, 1) TR (2, 1) BR (2, 2) BL (1, 2) @ 1`)
// Print paper
room.assert(`camera 99 sees paper 1382 at TL (1, 1) TR (2, 1) BR (2, 2) BL (1, 2) @ 1`)
// Process Manager
room.assert(`camera 99 sees paper 1900 at TL (1, 1) TR (2, 1) BR (2, 2) BL (1, 2) @ 1`)
// Persist Projector Calibration
room.assert(`camera 99 sees paper 989 at TL (1, 1) TR (2, 1) BR (2, 2) BL (1, 2) @ 1`)
// Debug web viewer
room.assert(`camera 99 sees paper 10 at TL (1, 1) TR (2, 1) BR (2, 2) BL (1, 2) @ 1`)
// Latency measurement
room.assert(`camera 99 sees paper 11 at TL (1, 1) TR (2, 1) BR (2, 2) BL (1, 2) @ 1`)
// HTTP Client
room.assert(`camera 1 sees paper 20 at TL (1, 1) TR (2, 1) BR (2, 2) BL (1, 2) @ 1`)
// JS compiler
room.assert(`camera 99 sees paper 40 at TL (1, 1) TR (2, 1) BR (2, 2) BL (1, 2) @ 1`)
// Run Seen RFID
room.assert(`camera 99 sees paper 45 at TL (0, 0) TR (2, 1) BR (2, 2) BL (1, 2) @ 1`)
// Photon Flasher
room.assert(`camera 99 sees paper 46 at TL (0, 0) TR (2, 1) BR (2, 2) BL (1, 2) @ 1`)
// Pointing At
room.assert(`camera 99 sees paper 277 at TL (1, 1) TR (2, 1) BR (2, 2) BL (1, 2) @ 1`)
// RFID Paper Map
room.assert(`camera 99 sees paper 30 at TL (0, 0) TR (2, 1) BR (2, 2) BL (1, 2) @ 1`)
// Region Debug Editor
room.assert(`camera 99 sees paper 12 at TL (1, 1) TR (2, 1) BR (2, 2) BL (1, 2) @ 1`)
// Claim laser region as laser calibration
room.assert(`camera 99 sees paper 911 at TL (1, 1) TR (2, 1) BR (2, 2) BL (1, 2) @ 1`)
// Highlight all laser regions
room.assert(`camera 99 sees paper 912 at TL (1, 1) TR (2, 1) BR (2, 2) BL (1, 2) @ 1`)
// Animation
room.assert(`camera 99 sees paper 401 at TL (0, 1080) TR (0, 0) BR (1920, 0) BL (1920, 1080) @ 1`)

room.assert(`Photon400035001547343433313338 can flash photon Photon3c002f000e47343432313031`)
room.assert(`camera 1 has projector calibration TL ( 0 , 0 ) TR ( 1920 , 0 ) BR ( 1920 , 1080 ) BL ( 0 , 1080 ) @ 9`)
room.assert(`camera 2 has projector calibration TL ( 512 , 282 ) TR ( 1712 , 229 ) BR ( 1788 , 961 ) BL ( 483 , 941 ) @ 9`)

run();
