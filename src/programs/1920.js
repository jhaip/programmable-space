const { room, myId, run } = require('../helper2')(__filename);

var last_time = 0;
var expire_time = 0;
var knownTimes = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

room.on(`microphone heard $x @ $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ x, t }) => {
if ((x.includes("alarm") || x.includes("timer")) && x.includes("minute")) {
  for (let i=0; i<knownTimes.length; i+=1) {
    if (x.includes(knownTimes[i])) {
      expire_time = last_time + i + 1;      
    }
  }
}

    });
  }
  room.subscriptionPostfix();
})

room.on(`time is $t`,
        results => {
  room.subscriptionPrefix(2);
  if (!!results && results.length > 0) {
    results.forEach(({ t }) => {
last_time = t;
if (expire_time > 0) {
  if (t >= expire_time) {
    expire_time = 0;
    room.assert(`wish speaker said`, ["text", `timer is done`])
  } else {
    room.assert(`wish speaker said`, ["text", `${expire_time - t}`])
  }
}

    });
  }
  room.subscriptionPostfix();
})




run();
