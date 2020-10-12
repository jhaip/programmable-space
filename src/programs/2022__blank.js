const { room, myId, run } = require('../helper2')(__filename);

room.on(`count is $x`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ x }) => {

for (let i=0; i<10; i+=1) {
  let v = (x % 10 == i) ? 10 : 0;
  room.assert(`wish circuit playground neopixel ${i} had color 0 ${v} 0`)
}


    });
  }
  room.subscriptionPostfix();
})


run();
