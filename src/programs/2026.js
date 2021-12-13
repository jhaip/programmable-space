const { room, myId, run } = require('../helpers/helper')(__filename);

log = []
room.on(`time is $t`,
        `activity is $x`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ t, x }) => {
  if (log.length == 0 || log[log.length-1].activity != x) {
    log.push({"time": t, "activity": x})
  }
  let ill = room.newIllumination()
  ill.fontcolor("white")
  ill.fontsize(100)
  log.forEach((l, i) => {
    let tText = (new Date(l.time)).toLocaleTimeString()
    ill.text(100, 100 + i*100, `[${tText}] ${l.activity}`)
  })
  room.draw(ill)


    });
  }
  room.subscriptionPostfix();
})


run();
