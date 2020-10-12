const { room, myId, MY_ID_STR } = require('../helper2')(__filename);

let fontSize = 18;
const origin = [0, 0]
let cursorPosition = [0, 0]
let currentWidth = 1;
let currentHeight = 1;
let editorWidthCharacters = 1;
let editorHeightCharacters = 1;
let windowPosition = [0, 0]
let currentTargetName;
let currentTargetId;
let currentSourceCode = "";

const correctCursorPosition = () => {
  const lines = currentSourceCode.split("\n");
  cursorPosition[1] = Math.max(0,
    Math.min(
      cursorPosition[1],
      Math.max(0, lines.length - 1)
    )
  );
  cursorPosition[0] = Math.max(0,
    Math.min(
      cursorPosition[0],
      Math.max(0, lines[cursorPosition[1]].length)
    )
  );
}

const correctWindowPosition = () => {
  if (cursorPosition[1] < windowPosition[1]) {
    windowPosition[1] = cursorPosition[1];
  } else if (cursorPosition[1] >= windowPosition[1] + editorHeightCharacters) {
    windowPosition[1] = Math.max(0, cursorPosition[1] - editorHeightCharacters + 1);
  }
}

const insertChar = (char) => {
  console.log("inserting char", char);
  const index = getCursorIndex();
  console.log("index is", index)
  currentSourceCode = [
    currentSourceCode.slice(0, index),
    char,
    currentSourceCode.slice(index)
  ].join('');
  if (char === "\n") {
    cursorPosition = [0, cursorPosition[1] + 1];
  } else {
    cursorPosition[0] += 1;
  }
  render();
}

const deleteChar = () => {
  const index = getCursorIndex();
  if (index > 0) {
    if (cursorPosition[0] === 0) {
      cursorPosition[1] = Math.max(0, cursorPosition[1] - 1);
      const lines = currentSourceCode.split("\n");
      cursorPosition[0] = lines[cursorPosition[1]].length;
    } else {
      cursorPosition[0] -= 1;
    }
    currentSourceCode = [
      currentSourceCode.slice(0, index-1),
      currentSourceCode.slice(index)
    ].join('');
    render();
  }
}

const getCursorIndex = () => {
  const lines = currentSourceCode.split("\n");
  const linesBeforeCursor = lines.slice(0, cursorPosition[1])
  return linesBeforeCursor.reduce((acc, line) => acc + line.length + 1, 0) + cursorPosition[0]
}

function parseForSyntaxHighlighting(s) {
  let specialParts = [];
  const matchFirst = (re, type) => {
    let match;
    while ((match = re.exec(s)) !== null) {
      specialParts.push({
        "type": type,
        "index": match.index + match[0].indexOf(match[1]),
        "length": match[1].length
      })
    }
  }
  matchFirst(/(?:^|\n)[ \t]*(when [^:]*:)(?:$|\n)/g, "when")
  matchFirst(/(?:^|\n)[ \t]*(otherwise:)(?:$|\n)/g, "otherwise")
  matchFirst(/(?:^|\n)[ \t]*(end)(?:$|\n)/g, "whenend")
  matchFirst(/(?:^|\n)[ \t]*(claim [^\n]*)(?:$|\n)/g, "claim")
  matchFirst(/(?:^|\n)[ \t]*(retract [^\n]*)(?:$|\n)/g, "retract")
  matchFirst(/(?:^|\n)[ \t]*(cleanup)(?:$|\n)/g, "cleanup")
  specialParts.sort((a, b) => a.index - b.index);
  let head = 0;
  let chunks = [];
  specialParts.forEach((part, i) => {
    if (part.index < head) {
      console.log("repeat index", part);
      return;
    }
    chunks.push({ type: "normal", text: s.slice(head, part.index) })
    chunks.push({ type: part.type, text: s.slice(part.index, part.index + part.length) })
    head = part.index + part.length;
  });
  chunks.push({ type: "normal", text: s.slice(head, s.length) })
  return chunks;
}

function convertSyntaxHighlightingToLines(syntaxChunks) {
  return syntaxChunks.reduce((lines, x) => {
    x.text.replace(
      new RegExp(String.fromCharCode(9787), 'g'),
      String.fromCharCode(34)
    ).split("\n").forEach((y, i) => {
      if (i > 0) {
        lines.push([])
      }
      if (y === "") {
        return;
      }
      let nSpaces = 0;
      if (lines[lines.length - 1].length > 0) {
        const nLineParts = lines[lines.length - 1].length;
        nSpaces = lines[lines.length - 1][nLineParts - 1].text.length;
      }
      lines[lines.length - 1].push(Object.assign({}, x, { text: " ".repeat(nSpaces) + y }))
    });
    return lines;
  }, [[]])
}

function getColorForSyntaxLinePart(part) {
  switch(part) {
    case "normal": return [255, 255, 255];
    case "when": return [0, 255, 255];
    case "otherwise": return [0, 165, 255];
    case "whenend": return [0, 0, 255];
    case "claim": return [0, 255, 0];
    case "retract": return [255, 165, 0];
    case "cleanup": return [255, 0, 0];
  }
  return [255, 255, 255];
}

const render = () => {
  editorWidthCharacters = 1000;
  const lineHeight = 1.3 * fontSize;
  editorHeightCharacters = Math.floor(currentHeight / lineHeight);
  console.log("editor height", editorHeightCharacters);
  correctCursorPosition();
  correctWindowPosition();
  room.retractMine(`draw graphics $ on $`) // room.cleanup();
  let lines = [[{type: "text", text: "Point at something!"}]]
  if (currentTargetName) {
    lines = convertSyntaxHighlightingToLines(parseForSyntaxHighlighting(currentSourceCode))
    console.error(lines)
  }
  let ill = room.newIllumination();
  lines.slice(windowPosition[1], windowPosition[1] + editorHeightCharacters).forEach((lineRaw, i) => {
    if (lineRaw.length === 0) {
      return; // skip drawing for this blank line
    }
    lineRaw.forEach(lineRawPart => {
      const line = lineRawPart.text.substring(0, editorWidthCharacters);
      ill.fontcolor(...getColorForSyntaxLinePart(lineRawPart.type));
      ill.fontsize(fontSize);
      ill.text(origin[0], (origin[1] + i * lineHeight), line);
    });
  });
  let cursorLine = "█";
  for (let q = 0; q < cursorPosition[0]; q+=1) {
    cursorLine = " " + cursorLine;
  }
  ill.fontcolor(255, 128, 2, 100);
  ill.text(origin[0], (origin[1] + (cursorPosition[1] - windowPosition[1]) * lineHeight), cursorLine);
  ill.fontcolor(255, 255, 255, 255)
  room.draw(ill)
  room.draw(ill)
  console.log("done rendering")
}

console.error("HEllo from text editor")
console.error("my id")
console.error(myId)

room.on(
  `paper ${myId} is pointing at paper $targetId`,
  `$targetName has paper ID $targetId`,
  `$targetName has source code $sourceCode`,
  `paper ${myId} has width $myWidth height $myHeight angle $ at ( $ , $ )`,
  results => {
  // ({assertions, retractions}) => {
    console.error("got stuff")
    console.error(results)
    // room.assert(`#${myId} draw "${fontSize}pt" text "Point at something!" at (${origin[0]}, ${origin[1]}) on paper ${myId}`)
    // currentTargetName = undefined;
    // currentSourceCode = "";
    // cursorPosition = [0, 0];
    // render();
    results.forEach(({targetId, targetName, sourceCode, myWidth, myHeight}) => {
      if (currentTargetName !== targetName) {
        currentTargetName = targetName;
        currentTargetId = targetId;
        currentSourceCode = sourceCode;
      }
      curentWidth = myWidth;
      currentHeight = myHeight;
      render();
    })
    if (!results || results.length === 0) {
      currentTargetName = undefined;
      currentTargetId = undefined;
      currentSourceCode = "";
      room.retractMine(
        `wish`, ["variable", ""], `would be running`
      )
      render();
    }
  }
)

room.on(
  `keyboard $ typed key $key @ $t`,
  results => {
    results.forEach(({ key }) => {
      console.log("key", key);
      insertChar(key);  
    })
  }
)

room.on(
  `keyboard $ typed special key $specialKey @ $t`,
  results => {
    results.forEach(({ specialKey }) => {
      if (!currentTargetName) {
        console.log(`no target to save`)
        return;
      }
      console.log("special key", specialKey);
      const special_key_map = {
        "enter": "\n",
        "space": " ",
        "tab": "\t",
        "doublequote": String.fromCharCode(34)
      }
      if (!!special_key_map[specialKey]) {
        insertChar(special_key_map[specialKey])
      } else if (specialKey === "up") {
        cursorPosition[1] -= 1;
        render();
      } else if (specialKey === "right") {
        cursorPosition[0] += 1;
        render();
      } else if (specialKey === "down") {
        cursorPosition[1] += 1;
        render();
      } else if (specialKey === "left") {
        cursorPosition[0] -= 1;
        render();
      } else if (specialKey === "backspace") {
        deleteChar();
      } else if (specialKey === "C-s") {
        const cleanSourceCode = currentSourceCode
          .replace(/"/g, String.fromCharCode(9787))
        room.assert(
          `wish`, ["text", currentTargetName],
          `has source code`, ["text", cleanSourceCode]);
        // claim it's not running to force the paper to be killed
        // so the source code change is used when it starts again
        console.log(`retract ${currentTargetName} ${currentTargetId}`)
        room.retractAll(
          `wish ${currentTargetId} would be running`
        )
        setTimeout(() => {
          room.assert(`wish ${currentTargetId} would be running`)
          room.flush();
          console.log(`claim ${currentTargetName} ${currentTargetId}`)
        }, 2000);
      } else if (specialKey === "C-n") {
        const language = currentTargetName.split(".")[1];
        const cleanSourceCode = currentSourceCode
          .replace(/"/g, String.fromCharCode(9787))
        //  .replace(/\n/g, '\\n')
        const millis = (new Date()).getTime()
        room.assert(
          `wish a paper would be created in`, ["text", language],
          `with source code`, ["text", cleanSourceCode],
          `@ ${millis}`);
      } else if (specialKey === "C-p") {
        room.assert(`wish paper ${currentTargetId} at`, ["text", currentTargetName], `would be printed`)
      } else if (specialKey === "C-+") {
        fontSize += 2;
        render();
      } else if (specialKey === "C--") {
        fontSize -= 2;
        render();
      }
    });
  }
)
