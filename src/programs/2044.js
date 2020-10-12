const { room, myId, run } = require('../helper2')(__filename);

room.on(`time is $time`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ time }) => {

let d = new Date(time*1000)
let timeString = d.toLocaleTimeString('en-US', {
  hour: '2-digit', minute: '2-digit'
});
let ill = room.newIllumination();
ill.fontcolor(150, 100, 100);
ill.fontsize(200);
ill.text(20, 160, timeString);
room.draw(ill);


    });
  }
  room.subscriptionPostfix();
})


run();
