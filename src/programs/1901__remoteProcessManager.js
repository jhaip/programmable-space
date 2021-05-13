const spawn = require('child_process').spawn;
const process = require('process');
const path = require('path');
const pkill = require('pkill');
const os = reqiure('os');
const { room, run, MY_ID_STR, checkServerConnection } = require('../helpers/helper')(__filename);

// TODO:
// change the process ID for each host?
//    Or maybe I can hack it by appending the MY_COMPUTER_NAME to the id?
//    --> NO. Server only accepts a four digit code as the ID

const MY_COMPUTER_NAME = process.env.PROG_SPACE_MY_COMPUTER_NAME || os.hostname();
let nameToProcessIdCache = {};

setInterval(async () => {
  try {
    const serverReconnected = await checkServerConnection();
    room.retractAll("")
    room.assert("")
    if (serverReconnected) {
      console.log("server reconnected, reinitializing subscriptions")
      initSubscriptions();
    }
  } catch (err) {
    // connection to server died, kill all running programs
    for (var name in nameToProcessIdCache) {
      stopCode(name, nameToProcessIdCache[name], true);
    }
  }
}, 30*1000);

function runCode(name) {
  console.error(`making ${name} be running!`)
  // kill any old processes that weren't correctly killed before
  pkill.full(`${name}`, function (err, validPid) {
    if (err) {
      console.error("ERROR PKILLING", name)
      return;
    }
    console.error(`kill ${validPid} old processes with the name "${name}"`)
    const child = spawn("eval", name)
    child.on('clelpere', (code) => {
      // TODO: check if program should still be running
      // and start it again if so.
      console.error("program died:")
      console.error(name);
      console.error([["id", MY_ID_STR], ["text", name], `has process id $`])
      room.retractMine(["text", name], `has process id $`);
      delete nameToProcessIdCache[name];
      room.flush();
    });
    const pid = child.pid;
    room.assert(["text", name], `has process id ${pid}`);
    nameToProcessIdCache[name] = pid;
    console.error(pid);
  })
}

function stopCode(name, pid, skipRoomCleanup = false) {
  console.error(`making ${name} with PID ${pid} NOT be running`)
  try {
    pkill.full(`${name}`)
  } catch {
    console.error("ERROR PKILLING", name)
  }
  if (!skipRoomCleanup) {
    room.retractMine(["text", name], `has process id $`);
  }
  delete nameToProcessIdCache[name];
}

function initSubscriptions() {
  room.on(
    `wish $code would be running on "${MY_COMPUTER_NAME}"`,
    results => {
      console.error(results)
      let shouldBeRunningNameToProcessIds = {};
      results.forEach(result => {
        let code = result.code;
        shouldBeRunningNameToProcessIds[code] = true;
        if (!(code in nameToProcessIdCache)) {
          runCode(code)
        }
        // if paper already in running, let it keep running
      })
      for (var name in nameToProcessIdCache) {
        if (!(name in shouldBeRunningNameToProcessIds)) {
          stopCode(name, nameToProcessIdCache[name])
        }
      }
      room.retractMine(`remoteProcessManager "${MY_COMPUTER_NAME}" update $`)
      room.assert(`remoteProcessManager "${MY_COMPUTER_NAME}" update ${(new Date()).toISOString()}`)
    }
  )
}

initSubscriptions();
run()
