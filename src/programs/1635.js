const { room, myId, run } = require('../helpers/helper')(__filename);

function draw(v) {
const colorMap = {
6: [255, 0, 0],
12: [255, 255, 0],
5: [0, 255, 255],
11: [0, 0, 255],
10: [0, 255, 0],
4: [255, 0, 255]
}
let ill = room.newIllumination()
ill.fontcolor(255, 255, 0)
ill.fontsize(80)
ill.text(55, 300, `${v}`)
ill.nostroke()
if (v in colorMap) {
  const col = colorMap[v];
  ill.fill(col[0], col[1], col[2])
  ill.rect(50, 50, 600, 900)
}
room.draw(ill)
}

room.on(`camera $ sees aruco $id at $ $ $ $ $ $ $ $ @ $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ id, t }) => {
  if (["2","7"].indexOf(id) === -1) {
    draw(parseInt(id))
  }

    });
  }
  room.subscriptionPostfix();
})



run();
