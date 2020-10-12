const fs = require('fs');
const { room, myId, scriptName, run } = require('../helper2')(__filename);

room.onGetSource('wisherId',
  `wish $name has source code $sourceCode`,
  results => {
    console.error(results);
    results.forEach(({ wisherId, name, sourceCode }) => {
      console.error("ON WISH SOURCE CODE")
      console.error(wisherId)
      console.error(name)
      console.error(sourceCode)
      if (!name.includes('.py') && !name.includes('.js') && !name.includes('.prejs')) {
        name += '.js'
      }
      sourceCode = sourceCode.replace(new RegExp(String.fromCharCode(9787), 'g'), String.fromCharCode(34))
      console.log('debug:::')
      console.log(`#${wisherId} wish "${name}" has source code $`)
      room.retractFromSource(wisherId, `wish`, ["text", name], `has source code $`)
      room.retractAll(["text", name], `has source code $`);
      fs.writeFile(`src/standalone_processes/${name}`, sourceCode, (err) => {
        if (err) throw err;
        console.error('The file has been saved!');
        room.assert(["text", name], `has source code`, ["text", sourceCode]);
        if (name.includes(".prejs")) {
          room.assert(`wish`, ["text", name], `would be compiled to js`);
        }
        room.flush();
      });
    })
  }
);
