const spawn = require('child_process').spawn;
const process = require('process');
const path = require('path');
const pkill = require('pkill');
const { room, myId, run, MY_ID_STR, getIdFromProcessName, getIdStringFromId } = require('../helper2')(__filename);

let nameToProcessIdCache = {};

function runPaper(name) {
  console.error(`making ${name} be running!`)
  // kill any old processes that weren't correctly killed before
  pkill.full(`${name}`, function (err, validPid) {
    if (err) {
      console.error("ERROR PKILLING", name)
      return;
    }
    console.error(`kill ${validPid} old processes with the name "${name}"`)
    let languageProcess = 'node'
    let programSource = `src/standalone_processes/${name}`
    let runArgs = [programSource];
    if (name.includes('.py')) {
      languageProcess = 'python3'
    } else if (name.includes('.go')) {
      languageProcess = 'go'
      runArgs = ['run', programSource]
    }
    const child = spawn(languageProcess, runArgs)
    // child.stdout.on('data', (data) => {
    //   console.error(`stdout for ${name}`);
    //   console.log(`stdout: ${data}`);
    // });
    // child.stderr.on('data', (data) => {
    //   console.error(`stderr for ${name}`);
    //   console.log(`stderr: ${data}`);
    // });
    child.on('close', (code) => {
      // TODO: check if program should still be running
      // and start it again if so.
      console.error("program died:")
      console.error(name);
      console.error([["id", MY_ID_STR], ["text", name], `has process id $`])
      room.retractMine(["text", name], `has process id $`);
      delete nameToProcessIdCache[name];
      room.flush();
      const dyingPaperIdString = getIdStringFromId(getIdFromProcessName(name))
      room.cleanupOtherSource(dyingPaperIdString)
    });
    const pid = child.pid;
    room.assert(["text", name], `has process id ${pid}`);
    nameToProcessIdCache[name] = pid;
    console.error(pid);
  })
}

function stopPaper(name, pid) {
  console.error(`making ${name} with PID ${pid} NOT be running`)
  try {
    pkill.full(`${name}`)
  } catch {
    console.error("ERROR PKILLING", name)
  }
  room.retractMine(["text", name], `has process id $`);
  delete nameToProcessIdCache[name];
  const dyingPaperIdString = getIdStringFromId(getIdFromProcessName(name))
  console.log("done STOPPING PID", pid, "with ID", dyingPaperIdString)
  room.cleanupOtherSource(dyingPaperIdString)
}

// room.on(
//   `$name has process id $pid`,
//   results => {
//     nameToProcessIdCache = {};
//     results.forEach(result => {
//       nameToProcessIdCache[result.name] = result.pid;
//     })
//     console.error("NEW name->PID map:")
//     console.error(nameToProcessIdCache);
//   }
// )

room.on(
  `wish $paperId would be running`,
  `$name has paper ID $paperId`,
  results => {
    console.error("$ wish $name would be running")
    console.error(results)
    let shouldBeRunningNameToProcessIds = {};
    results.forEach(result => {
      let paperName = result.name;
      if (paperName.includes(".prejs")) {
        paperName = paperName.replace(".prejs", ".js");
      }
      shouldBeRunningNameToProcessIds[paperName] = true;
      if (!(paperName in nameToProcessIdCache)) {
        runPaper(paperName)
      }
      // if paper already in running, let it keep running
    })
    for (var name in nameToProcessIdCache) {
      if (!(name in shouldBeRunningNameToProcessIds)) {
        stopPaper(name, nameToProcessIdCache[name])
      }
    }
    room.retractMine(`processManager update $`)
    room.assert(`processManager update ${(new Date()).toISOString()}`)
  }
)

const myName = path.basename(__filename);
room.assert(["text", myName], `has process id ${process.pid}`);
nameToProcessIdCache[myName] = process.pid;

run()
