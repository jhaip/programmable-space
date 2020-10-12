const fs = require('fs');
const { room, myId, scriptName, run } = require('../helper2')(__filename);

let existingIds = []

room.on(
  `$ has paper ID $id`,
  results => {
    existingIds = results.map(paper => paper.id);
    console.log("updated existing IDs", existingIds);
  }
)

room.onGetSource('wisherId',
  `wish a paper would be created in $language with source code $sourceCode @ $time`,
  results => {
    results.forEach(({ wisherId, language, sourceCode, time }) => {
      // choose ID that is unique
      console.error("Existing IDs")
      console.error(existingIds);
      let newId = null;
      while (newId === null || existingIds.includes(newId)) {
        newId = Math.floor(Math.random() * 8400/4)
      }
      console.log("new id", newId);

      // create a new file with the source code
      cleanSourceCode = sourceCode.replace(new RegExp(String.fromCharCode(9787), 'g'), String.fromCharCode(34))
      const shortFilename = `${newId}.${language}`;
      fs.writeFile(`src/standalone_processes/${shortFilename}`, cleanSourceCode, (err) => {
        if (err) {
          return console.log(err);
        }
        room.retractFromSource(wisherId, `wish a paper would be created in ${language} with source code $ @ ${time}`)
        room.assert(["text", shortFilename], `has source code`, ["text", sourceCode])
        room.assert(["text", shortFilename], `has paper ID ${newId}`)
        room.assert(`wish paper ${newId} at`, ["text", shortFilename], `would be printed`)
        room.flush();
      });
    })
  }
);
