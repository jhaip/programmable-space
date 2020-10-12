const Room = require('@living-room/client-js')
const fs = require('fs');
const path = require('path');
const readline = require('readline');

function init(filename) {
  const scriptName = path.basename(filename);
  const scriptNameNoExtension = path.parse(scriptName).name;
  const logPath = filename.replace(scriptName, 'logs/' + scriptNameNoExtension + '.log')
  const access = fs.createWriteStream(logPath)
  process.stdout.write = process.stderr.write = access.write.bind(access);
  process.on('uncaughtException', function(err) {
    console.error((err && err.stack) ? err.stack : err);
  })
  const myId = (scriptName.split(".")[0]).split("__")[0]
  const room = new Room()
  return {
    room, myId, scriptName
  }
}

module.exports = init
