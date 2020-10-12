const { room, myId, run } = require('../helper2')(__filename);

let data = []
const max_data = 10
const OX = 120
const W = 5
const H = 5
const C = 4

room.on(`$ says the humidity is $H and temp is $T`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ H, T }) => {
  data.push(H);
  data = data.slice(-max_data);
  let ill = room.newIllumination()
  ill.fontsize(12)
  ill.text(25, 25, data.join("\n"))
  ill.line(OX, H, OX + max_data*W, H)
  ill.line(OX, H, OX, H + 100*C)
  ill.stroke(255, 255, 0)
  for (let i = 0; i < data.length; i += 1) {
    if (i > 0) {
      ill.line(OX + (i-1)*W, H+data[i-1]*C,
               OX +     i*W, H+data[i]  *C)
    }
    ill.ellipse(OX + i*W, H+data[i]*C, 3, 3)
  }
  room.draw(ill)

    });
  } else {
  let ill = room.newIllumination()
  ill.text(25, 25, "No data yet")
  room.draw(ill)

  }
  room.subscriptionPostfix();
})


run();
