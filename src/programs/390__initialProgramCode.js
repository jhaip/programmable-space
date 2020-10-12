const fs = require('fs');
const path = require('path')
const { room, myId, scriptName, run, getIdStringFromId } = require('../helper2')(__filename);

const readFile = readLogPath => {
  try {
    sourceCodeData = fs.readFileSync(readLogPath, 'utf8');
    sourceCode = sourceCodeData
      // .replace(/\n/g, '\\n')
      .replace(/"/g, String.fromCharCode(9787))
    // console.log(`"${readLogPath}" has source code "${sourceCode}"`)

    const shortFilename = path.basename(readLogPath);
    let paperId = "";
    if (!shortFilename.includes(".")) {
      console.log("skipping the binary", shortFilename)
      return;
    }
    if (shortFilename === '__init__.py' || shortFilename === 'helper.py') {
      return;
    }
    if (shortFilename.includes("__")) {
      paperId = shortFilename.split("__")[0];
    } else if (shortFilename.includes(".")) {
      paperId = shortFilename.split(".")[0];
    }
    console.log(`#${myId} "${shortFilename}" has paper ID ${paperId}`)

    room.assert(["text", shortFilename], `has source code`, ["text", sourceCode])
    room.assert(["text", shortFilename], `has paper ID ${paperId}`)
    room.assert(`paper ${paperId} has id`, ["id", getIdStringFromId(paperId)])
    run()
    console.log(`done with "${shortFilename}"`)
  } catch (e) {
    console.error("readLogPath", readLogPath)
    console.error(e);
  }
}

const loadModulesInFolder = folder => {
  const processesFolder = path.join(__dirname, folder)
  console.log(processesFolder)
  const processFiles = fs.readdirSync(processesFolder);
  console.log(processFiles);
  console.log("---")
  processFiles.forEach(processFile => {
    try {
      const processFilePath = path.join(processesFolder, processFile)
      console.log(fs.lstatSync(processFilePath).isFile())
      if (!fs.lstatSync(processFilePath).isFile()) {
        return
      }
      if (
        processFile.includes(".js") &&
        processFiles.includes(processFile.replace(".js", ".prejs"))
      ) {
        console.error(`returning because ${processFile} is a .js of a .prejs file`)
        return
      }
      readFile(processFilePath)
    } catch (e) {
      console.error(e)
    }
  })
}

loadModulesInFolder('.');
// TODO: remove this HACK
// need a way to exit the node program after all promises have returned
// promises come from asserting and retracting things in the lovelace library code
setTimeout(() => {
  process.exit()
}, 5000)
