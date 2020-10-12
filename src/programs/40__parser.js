const fs = require('fs');
const { room, myId, run } = require('../helper2')(__filename);

room.onGetSource('wisherId',
  `wish $name would be compiled to js`,
  results => {
    console.log("results:")
    console.log(results)
    room.cleanup()
    results.forEach(({ wisherId, name }) => {
      const sourceCode = fs.readFileSync(`src/standalone_processes/${name}`, 'utf8');
      const parsedSourceCode = parse(sourceCode);
      fs.writeFile(
        `src/standalone_processes/${name.replace(".prejs", ".js")}`,
        parsedSourceCode, (err) => {
          if (err) throw err;
          console.error('The file has been saved!');
          room.retractFromSource(wisherId, `wish`, ["text", name], `would be compiled to js`)
          room.flush();
        }
      );
    })
  }
)

function parse(x) {
  const STATES = { "GLOBAL": "GLOBAL", "WHEN_QUERY_PARAMS": "WHEN_QUERY_PARAMS", "WHEN_TRUE": "WHEN_TRUE", "WHEN_OTHERWISE": "WHEN_OTHERWISE", "WHEN_NEW_RESULTS_QUERY_PARAMS": "WHEN_NEW_RESULTS_QUERY_PARAMS", "WHEN_NEW_RESULTS": "WHEN_NEW_RESULTS" }
  let STATE = STATES.GLOBAL;
  let WHEN_VARIABLES_CACHE = "";
  let OUTPUT = "";
  OUTPUT += "const { room, myId, run } = require('../helper2')(__filename);\n\n"

  const claimRetractCleanupCheck = s => {
    let m = s.match(/^(\s*)claim (.+)\s*$/);
    if (m !== null) OUTPUT += `${m[1]}room.assert(\`${m[2]}\`)\n`;
    m = s.match(/^(\s*)global claim (.+)\s*$/);
    if (m !== null) OUTPUT += `${m[1]}room.globalAssert(\`${m[2]}\`)\n`;
    m = s.match(/^(\s*)retract (.+)\s*$/);
    if (m !== null) OUTPUT += `${m[1]}room.retractAll(\`${m[2]}\`)\n`;
    m = s.match(/^(\s*)global retract (.+)\s*$/);
    if (m !== null) OUTPUT += `${m[1]}room.retractAll(\`${m[2]}\`)\n`;
    m = s.match(/^(\s*)cleanup\s*$/);
    if (m !== null) OUTPUT += `${m[1]}room.cleanup()\n`;
  }

  const getUniqueVariables = s => {
    const variables = s.match(/\$([a-zA-Z0-9]+)/g);
    if (variables) {
      return variables
        .map(x => x.slice(1))
        .filter((value, index, self) => self.indexOf(value) === index);
    }
    return [];
  }

  const lines = x.split("\n").concat("");  // parser needs code to end in a blank line so add one to be safe
  let currentSubscriptionId = 0;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const prevOUTPUT = OUTPUT.slice();
    const line = lines[lineIndex];
    const isLastLine = lineIndex === lines.length - 1;
    if (STATE === STATES.GLOBAL) {
      claimRetractCleanupCheck(line);
      if (line.match(/^when new \$results of /)) {
        STATE = STATES.WHEN_NEW_RESULTS_QUERY_PARAMS;
        currentSubscriptionId += 1;
        if (line.slice(-1) === ':') {
          const query = line.match(/^when new \$results of (.+):$/)[1]
          const variables = getUniqueVariables(query);
          const bySourceQueryMatch = line.match(/^when new \$results of (.+) by \$source:$/)
          if (bySourceQueryMatch) {
            OUTPUT += `room.onGetSource('source', \`${bySourceQueryMatch[1]}\`,\n`
          } else {
            OUTPUT += `room.on(\`${query}\`,\n`
          }
          OUTPUT += `        results => {\n`
          STATE = STATES.WHEN_NEW_RESULTS;
        } else if (line.slice(-1) === ',') {
          const query = line.match(/^when new \$results of (.+),$/)[1]
          OUTPUT += `room.on(\`${query}\`,\n`
        } else {
          console.error("bad when query!")
        }
      } else if (line.match(/^when /)) {
        STATE = STATES.WHEN_QUERY_PARAMS;
        currentSubscriptionId += 1;
        if (line.slice(-1) === ':') {
          const query = line.match(/^when (.+):$/)[1]
          const variables = getUniqueVariables(query);
          const bySourceQueryMatch = line.match(/^when (.+) by \$source:$/)
          if (bySourceQueryMatch) {
            OUTPUT += `room.onGetSource('source', \`${bySourceQueryMatch[1]}\`,\n`
          } else {
            OUTPUT += `room.on(\`${query}\`,\n`
          }
          OUTPUT += `        results => {\n`
          OUTPUT += `  room.subscriptionPrefix(${currentSubscriptionId});\n`
          OUTPUT += `  if (!!results && results.length > 0) {\n`
          OUTPUT += `    results.forEach(({ ${variables.join(", ")} }) => {\n`
          STATE = STATES.WHEN_TRUE;
        } else if (line.slice(-1) === ',') {
          const query = line.match(/^when (.+),$/)[1]
          WHEN_VARIABLES_CACHE = query;
          OUTPUT += `room.on(\`${query}\`,\n`
        } else {
          console.error("bad when query!")
        }
      }
    } else if (STATE == STATES.WHEN_TRUE) {
      claimRetractCleanupCheck(line);
      if (line.match(/^otherwise:$/)) {
        STATE = STATES.WHEN_OTHERWISE;
        OUTPUT += "\n    });\n  } else {\n"
      }
      if (line.match(/^end$/) || isLastLine) {
        STATE = STATES.GLOBAL;
        OUTPUT += "\n    });\n";
        OUTPUT += "  }\n  room.subscriptionPostfix();\n})\n";
      }
    } else if (STATE == STATES.WHEN_OTHERWISE) {
      claimRetractCleanupCheck(line);
      if (line.match(/^end$/) || isLastLine) {
        STATE = STATES.GLOBAL;
        OUTPUT += "  }\n  room.subscriptionPostfix();\n})\n";
      }
    } else if (STATE == STATES.WHEN_NEW_RESULTS) {
      claimRetractCleanupCheck(line);
      if (line.match(/^end$/) || isLastLine) {
        STATE = STATES.GLOBAL;
        OUTPUT += "\n})\n";
      }
    } else if (STATE == STATES.WHEN_QUERY_PARAMS || STATE == STATES.WHEN_NEW_RESULTS_QUERY_PARAMS) {
      const m = line.match(/^\s*(.+),$/)
      if (m) {
        const query = m[1]
        WHEN_VARIABLES_CACHE += ' ' + query;
        OUTPUT += `        \`${query}\`,\n`
      } else {
        const m2 = line.match(/^\s*(.+):$/)
        if (m2) {
          const query = m2[1]
          WHEN_VARIABLES_CACHE += ' ' + query;
          OUTPUT += `        \`${query}\`,\n`
          OUTPUT += `        results => {\n`
          if (STATE == STATES.WHEN_QUERY_PARAMS) {
            OUTPUT += `  room.subscriptionPrefix(${currentSubscriptionId});\n`
            OUTPUT += `  if (!!results) {\n`
            const variables = getUniqueVariables(WHEN_VARIABLES_CACHE)
            OUTPUT += `    results.forEach(({ ${variables.join(", ")} }) => {\n`
            STATE = STATES.WHEN_TRUE;
          } else if (STATE == STATES.WHEN_NEW_RESULTS_QUERY_PARAMS) {
            STATE = STATES.WHEN_NEW_RESULTS;
          }
        } else {
          console.error("BAD QUERY")
        }
      }
    }
    if (prevOUTPUT === OUTPUT) {
      OUTPUT += line + "\n";
    }
  }

  if (STATE === STATES.WHEN_QUERY_PARAMS || STATE === STATES.WHEN_NEW_RESULTS_QUERY_PARAMS) {
    console.error("NO END TO WHEN QUERY")
  }
  OUTPUT += "\n\nrun();\n"
  return OUTPUT;
}

run();
