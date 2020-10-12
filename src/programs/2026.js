const { room, myId, run } = require('../helper2')(__filename);

room.on(`count is $count`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ count }) => {
  let ill = room.newIllumination()
  ill.push()
  ill.fontcolor("white")
  ill.fontsize(100)
  ill.text(400, 400, `Count is ${count}`)
  ill.pop()
  room.draw(ill, "web2")


    });
  }
  room.subscriptionPostfix();
})


run();
