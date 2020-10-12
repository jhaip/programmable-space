const { room, myId, run } = require('../helper2')(__filename);

N = 20
L = []

room.on(`measured latency $x ms at $`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ x }) => {
L.push(x)
L = L.slice(-N)
let ill = room.newIllumination()
ill.fontsize(20)
ill.fontcolor(255, 255, 255)
ill.fill(255, 0, 0, 128)
ill.nostroke()
L.forEach((v, i) => {
  ill.text(0, i*25, `LAG: ${v}`)
  ill.rect(100, i*25, Math.min(+v, 1000), 20)
})
room.draw(ill)


    });
  }
  room.subscriptionPostfix();
})


run();
