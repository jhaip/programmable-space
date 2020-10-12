const { room, myId, run } = require('../helper2')(__filename);

room.on(`microphone heard $x @ $t`,
        `current weather is $temp F and $weather`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ x, t, temp, weather }) => {
if (x.includes("what") && (x.includes("weather") || x.includes("temperature"))) {
room.assert(`wish speaker said`, ["text", `It is ${temp} degrees and ${weather.split("-").join(" ")}`])
}


    });
  }
  room.subscriptionPostfix();
})


run();
