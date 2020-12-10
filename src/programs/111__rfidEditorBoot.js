const execFile = require('child_process').execFile;
const execFileSync = require('child_process').execFileSync;
const { room, myId, scriptName, run } = require('../helpers/helper')(__filename);

/*** Start the program that can start all other programs ***/
console.error("pre--------DONE WITH INITIAL PROGRAM CODE")
const child0 = execFileSync(
    'node',
    [`src/programs/390__initialProgramCode.js`]
);
console.error("DONE WITH INITIAL PROGRAM CODE")
const child = execFile(
    'node',
    [`src/programs/1900__processManager.js`],
    (error, stdout, stderr) => {
        if (error) {
            console.error('stderr', stderr);
            console.error(error);
        }
        console.log('stdout', stdout);
    });

// room.assert('wish 1606 would be running') // removed until #1900 can run go programs
const w = 1280;
const h = 720;
const o = 200;
room.assert(`camera 1997 should calibrate to ${o} ${o} ${w - o} ${o} ${w - o} ${h - o} ${o} ${h - o} on display 1997`)
room.assert(`camera 1998 should calibrate to 0 0 854 0 854 480 0 480 on display 1998`)
room.assert(`camera 1 should calibrate to 0 0 1280 0 1280 720 0 720 on display 1993`)
room.assert(`camera 1994 should calibrate to 0 0 1920 0 1920 1080 0 1080 on display 1994`)

run();
