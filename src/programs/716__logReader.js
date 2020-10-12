const fs = require('fs');
const readline = require('readline');
const { room, myId, scriptName } = require('../helper')(__filename);

console.log("start testProcess")

const targetProcess = 'testProcess'
const readLogPath = __filename.replace(scriptName, `logs/${targetProcess}.log`)
const rl = readline.createInterface({
  input: fs.createReadStream(readLogPath),
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  console.log(`Line from file: ${line}`);
});
