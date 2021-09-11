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

room.assert('wish 1900 would be running') // process mananger
room.assert('wish 112 would be running') // this program
room.assert('wish 390 would be running') // initial program code
room.assert('wish 10 would be running') // debug view
room.assert('wish 20 would be running') // http proxy
room.assert('wish 40 would be running') // parser
room.assert('wish 498 would be running') // printing manager
room.assert('wish 577 would be running') // edit papers
room.assert('wish 1459 would be running') // create new paper
room.assert('wish 826 would be running') // run seen papers
room.assert('wish 11 would be running') // latency monitor
room.assert('wish 1636 would be running') // arucowebmanager

room.assert('wish 1631 would be running')


run();
