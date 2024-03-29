const fs = require("fs");
const path = require("path");
const uuidV4 = require("uuid/v4");
var WebSocketClient = require("websocket").client;

var client = new WebSocketClient();
var connection;
var disconnectedQueuedSends = [];

const randomId = () => uuidV4();

function sleep(millis) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}

const stringToTerm = (x) => {
  if (x[0] === `"`) {
    return ["text", x.slice(1, -1)];
  }
  if (isNaN(x) || x === "") {
    if (x[0] === "#") {
      return ["id", x.slice(1)];
    }
    if (x[0] === "$") {
      return ["variable", x.slice(1)];
    }
    if (x[0] === "%") {
      return ["postfix", x.slice(1)];
    }
    return ["text", x];
  }
  if (x.indexOf(".") === -1) {
    return ["integer", (+x).toString()];
  }
  return ["float", (+x).toFixed(6)];
};

const tokenizeString = (str) => {
  // from https://stackoverflow.com/questions/2817646/javascript-split-string-on-space-or-on-quotes-to-array
  var spacedStr = str
    .trim()
    .replace(/\)/g, " ) ")
    .replace(/\(/g, " ( ")
    .replace(/,/g, " , ")
    .trim();
  var aStr = spacedStr.match(/[\w,()@#:\-\.\$\%]+|"[^"]+"/g),
    i = aStr.length;
  while (i--) {
    aStr[i] = aStr[i].replace(/"/g, "");
  }
  return aStr;
};

const fullyParseFact = (q) => {
  if (typeof q === "string") {
    const q_tokens = tokenizeString(q);
    return q_tokens.map((x) => stringToTerm(x));
  } else if (Array.isArray(q)) {
    let terms = [];
    for (var i = 0, len = q.length; i < len; i++) {
      if (typeof q[i] === "string") {
        const q_tokens = tokenizeString(q[i]);
        terms = terms.concat(q_tokens.map((x) => stringToTerm(x)));
      } else {
        terms = terms.concat([q[i]]);
      }
    }
    return terms;
  }
};

function getIdFromProcessName(scriptName) {
  return scriptName.split(".")[0].split("__")[0];
}

function getIdStringFromId(id) {
  return String(id).padStart(4, "0");
}

class Illumination {
  constructor() {
    this.illuminations = [];
    this.add = (type, opts) => {
      this.illuminations.push({ type: type, options: opts });
    };
    this.addColorType = (type, opts) => {
      opts = opts.length === 1 ? opts[0] : opts;
      this.add(type, opts);
    };
  }
  rect(x, y, w, h) {
    this.add("rectangle", { x: x, y: y, w: w, h: h });
  }
  ellipse(x, y, w, h) {
    this.add("ellipse", { x: x, y: y, w: w, h: h });
  }
  text(x, y, txt) {
    this.add("text", { x: x, y: y, text: txt });
  }
  line(x1, y1, x2, y2) {
    this.add("line", [x1, y1, x2, y2]);
  }
  // point format: [[x1, y1], [x2, y2], ...]
  polygon(points) {
    this.add("polygon", points);
  }
  image(x, y, w, h, base64image) {
    this.add("image", {
      x: x,
      y: y,
      w: w,
      h: h,
      bitmap_image_base64: base64image,
    });
  }
  video(x, y, w, h, filename) {
    this.add("video", { x: x, y: y, w: w, h: h, filename: filename });
  }
  // color format: string, [r, g, b], or [r, g, b, a]
  fill(...color) {
    this.addColorType("fill", color);
  }
  stroke(...color) {
    this.addColorType("stroke", color);
  }
  nostroke() {
    this.add("nostroke", []);
  }
  nofill() {
    this.add("nofill", []);
  }
  strokewidth(width) {
    this.add("strokewidth", width);
  }
  fontsize(width) {
    this.add("fontsize", width);
  }
  fontcolor(...color) {
    this.addColorType("fontcolor", color);
  }
  push() {
    this.add("push", []);
  }
  pop() {
    this.add("pop", []);
  }
  translate(x, y) {
    this.add("translate", { x: x, y: y });
  }
  rotate(radians) {
    this.add("rotate", radians);
  }
  scale(x, y) {
    this.add("scale", { x: x, y: y });
  }
  set_transform(m11, m12, m13, m21, m22, m23, m31, m32, m33) {
    this.add("transform", [m11, m12, m13, m21, m22, m23, m31, m32, m33]);
  }
  toString() {
    return JSON.stringify(this.illuminations);
  }
}

function init(filename, myOverrideId) {
  const scriptName = path.basename(filename);
  const scriptNameNoExtension = path.parse(scriptName).name;
  const logPath = filename.replace(
    scriptName,
    "logs/" + scriptNameNoExtension + ".log"
  );
  const access = fs.createWriteStream(logPath);
  process.stdout.write = process.stderr.write = access.write.bind(access);
  process.on("uncaughtException", function (err) {
    console.error(err && err.stack ? err.stack : err);
  });
  const myId = myOverrideId || getIdFromProcessName(scriptName);

  const rpc_url = process.env.PROG_SPACE_SERVER_URL || "localhost";
  const MY_ID_STR = getIdStringFromId(myId);

  client.on("connectFailed", function (error) {
    console.log("Connect Error: " + error.toString());
    connection = undefined;
  });

  client.on("connect", function (myconnection) {
    connection = myconnection;
    disconnectedQueuedSends.forEach((msg) => send(msg));
    disconnectedQueuedSends = [];

    console.log("WebSocket Client Connected");
    connection.on("error", function (error) {
      console.log("Connection Error: " + error.toString());
      connection = undefined;
    });
    connection.on("close", function () {
      console.log("echo-protocol Connection Closed");
      connection = undefined;
    });
    connection.on("message", function (message) {
      if (message.type !== "utf8") {
        console.error("NOT UTF8 data!");
        return;
      }
      const msg = `${message.utf8Data}`;
      // console.log(msg)
      const source_len = 4;
      const SUBSCRIPTION_ID_LEN = randomId().length;
      const SERVER_SEND_TIME_LEN = 13;
      const id = msg.slice(source_len, source_len + SUBSCRIPTION_ID_LEN);
      const val = msg.slice(
        source_len + SUBSCRIPTION_ID_LEN + SERVER_SEND_TIME_LEN
      );
      if (id == init_ping_id) {
        server_listening = true;
        console.log(`SERVER LISTENING!! ${MY_ID_STR} ${val}`);
      } else if (id in select_ids) {
        const callback = select_ids[id];
        delete select_ids[id];
        callback(val);
      } else if (id in subscription_ids) {
        callback = subscription_ids[id];
        // room.cleanup()
        const r = parseResult(val);
        callback(r);
        room.flush();
      } else {
        console.log("unknown subscription ID...");
      }
    });
  });

  client.connect(`ws://${rpc_url}:8080/`);

  let init_ping_id = randomId();
  let select_ids = {};
  let subscription_ids = {};
  let server_listening = false;
  let sent_ping = false;
  let batched_calls = [];
  const DEFAULT_SUBSCRIPTION_ID = 0;
  let currentSubscriptionId = DEFAULT_SUBSCRIPTION_ID;

  const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  const waitForServerListening = (timeout_ms = 5000) => {
    return new Promise(async (resolve, reject) => {
      const listeningStartTime = new Date();
      while (!connection) {
        if (new Date() - listeningStartTime > timeout_ms) {
          reject(new Error("broker did not respond in timeout window"));
          return;
        }
        await sleep(100);
        // await null; // prevents app from hanging
      }
      resolve();
    });
  };

  // TODO: probably want to rethink this for websockets
  // checks if server is connected
  // returns a promise
  // if server responds, it returns a boolean if it was a reconnection to the server
  // if server doesn't response, the promise is rejected
  const checkServerConnection = () => {
    console.log("checking if broker is still listening");
    return new Promise(async (resolve, reject) => {
      try {
        sent_ping = false;
        server_listening = false; // global
        init_ping_id = randomId(); // global
        await waitForServerListening();
        resolve();
      } catch (err) {
        console.log(err);
        // clear my cache of subscriptions
        subscription_ids = {}; // global
        reject(new Error("lost broker connection"));
      }
    });
  };

  const send = (val) => {
    // queue up messages waiting for the
    if (connection && connection.connected) {
      connection.sendUTF(val);
    } else {
      disconnectedQueuedSends.push(val);
    }
  };

  const room = {
    onRaw: async (...args) => {
      await waitForServerListening();
      const query_strings = args.slice(0, -1);
      const callback = args[args.length - 1];
      const subscription_id = randomId();
      const query_msg = {
        id: subscription_id,
        facts: query_strings,
      };
      const query_msg_str = JSON.stringify(query_msg);
      subscription_ids[subscription_id] = callback;
      send(`SUBSCRIBE${MY_ID_STR}${query_msg_str}`);
    },
    onGetSource: async (...args) => {
      const sourceVariableName = args[0];
      const query_strings = args
        .slice(1, -1)
        .map((s) => `$${sourceVariableName} $ ${s}`);
      const callback = args[args.length - 1];
      room.onRaw(...query_strings, callback);
    },
    on: async (...args) => {
      const query_strings = args.slice(0, -1).map((s) => `$ $ ${s}`);
      const callback = args[args.length - 1];
      room.onRaw(...query_strings, callback);
    },
    select: async (...args) => {
      await waitForServerListening();
      const query_strings = args.slice(0, -1);
      const callback = args[args.length - 1];
      const select_id = randomId();
      const query_msg = {
        id: select_id,
        facts: query_strings,
      };
      const query_msg_str = JSON.stringify(query_msg);
      select_ids[select_id] = callback;
      send(`...SELECT${MY_ID_STR}${query_msg_str}`);
    },
    assertNow: (fact) => {
      send(`....CLAIM${MY_ID_STR}${fact}`);
    },
    assertForOtherSource: (otherSource, fact) => {
      batched_calls.push({
        type: "claim",
        fact: [
          ["id", otherSource],
          ["id", `${DEFAULT_SUBSCRIPTION_ID}`],
        ].concat(fullyParseFact(fact)),
      });
    },
    assertRaw: (fact) => {
      batched_calls.push({
        type: "claim",
        fact: fullyParseFact(fact),
      });
    },
    assert: (...args) => {
      batched_calls.push({
        type: "claim",
        fact: [
          ["id", MY_ID_STR],
          ["id", `${currentSubscriptionId}`],
        ].concat(fullyParseFact(args)),
      });
    },
    globalAssert: (...args) => {
      batched_calls.push({
        type: "claim",
        fact: [
          ["id", MY_ID_STR],
          ["id", `0`],
        ].concat(fullyParseFact(args)),
      });
    },
    retractNow: (query) => {
      send(`..RETRACT${MY_ID_STR}${query}`);
    },
    retractRaw: (...args) => {
      // TODO: need to push into an array specific to the subsciber, in case there are multiple subscribers in one client
      batched_calls.push({ type: "retract", fact: fullyParseFact(args) });
    },
    retractMine: (...args) => {
      if (typeof args === "string") {
        room.retractRaw(`#${MY_ID_STR} $ ${args}`);
      } else if (Array.isArray(args)) {
        room.retractRaw(
          ...[
            ["id", MY_ID_STR],
            ["variable", ""],
          ].concat(args)
        );
      }
    },
    retractMineFromThisSubscription: (...args) => {
      if (typeof args === "string") {
        room.retractRaw(`#${MY_ID_STR} #${currentSubscriptionId} ${args}`);
      } else if (Array.isArray(args)) {
        room.retractRaw(
          ...[
            ["id", MY_ID_STR],
            ["id", `${currentSubscriptionId}`],
          ].concat(args)
        );
      }
    },
    retractFromSource: (...args) => {
      const source = args[0];
      const retractArgs = args.slice(1);
      if (typeof retractArgs === "string") {
        room.retractRaw(`#${source} $ ${retractArgs}`);
      } else if (Array.isArray(retractArgs)) {
        room.retractRaw(
          ...[
            ["id", `${source}`],
            ["variable", ""],
          ].concat(retractArgs)
        );
      }
    },
    retractAll: (...args) => {
      if (typeof args === "string") {
        room.retractRaw(`$ $ ${args}`);
      } else if (Array.isArray(args)) {
        room.retractRaw(
          ...[
            ["variable", ""],
            ["variable", ""],
          ].concat(args)
        );
      }
    },
    flush: () => {
      // TODO: need to push into an array specific to the subsciber, in case there are multiple subscribers in one client
      room.batch(batched_calls);
      batched_calls = [];
    },
    batch: (batched_calls) => {
      const fact_str = JSON.stringify(batched_calls);
      send(`....BATCH${MY_ID_STR}${fact_str}`);
    },
    cleanup: () => {
      room.retractMine(`%`);
    },
    cleanupOtherSource: (otherSource) => {
      const fact_str = JSON.stringify([
        { type: "death", fact: [["id", otherSource]] },
      ]);
      send(`....BATCH${MY_ID_STR}${fact_str}`);
    },
    draw: (illumination, target) => {
      target = typeof target === "undefined" ? myId : target;
      room.assert(
        `draw graphics`,
        ["text", illumination.toString()],
        `on ${target}`
      );
    },
    newIllumination: () => {
      return new Illumination();
    },
    subscriptionPrefix: (id) => {
      currentSubscriptionId = id;
      room.retractMineFromThisSubscription(["postfix", ""]);
    },
    subscriptionPostfix: () => {
      currentSubscriptionId = 0;
    },
  };

  const parseResult = (result_str) => {
    return JSON.parse(result_str).map((result) => {
      let newResult = {};
      for (let key in result) {
        // result[key] = ["type", "value"]
        // for legacy reasons, we just want the value
        const value_type = result[key][0];
        if (value_type === "integer" || value_type === "float") {
          newResult[key] = +result[key][1];
        } else {
          newResult[key] = result[key][1];
        }
      }
      return newResult;
    });
  };

  const run = async () => {
    await waitForServerListening();
    room.flush();
    // without this loop, the program could exit
    while(true) { await sleep(1000); }
  };

  const afterServerConnects = async (callback) => {
    await waitForServerListening();
    callback();
  };

  return {
    room,
    myId,
    scriptName,
    MY_ID_STR,
    run,
    getIdFromProcessName,
    getIdStringFromId,
    afterServerConnects,
    fullyParseFact,
    checkServerConnection,
  };
}

module.exports = init;
