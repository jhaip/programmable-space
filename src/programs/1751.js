const { room, myId, run } = require('../helper2')(__filename);

room.onRaw(`$ $ paper ${myId} is pointing at paper $id`,
           `$ $ paper $id has id $fullId`,
           `$fullId $ $title data is $x`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ title, x }) => {
    data = x.toString().split(" , ").map(v => parseFloat(v))
    const rollingAvg = data.reduce((acc, v) => acc + v * 1.0 / data.length, 0);
    ill = room.newIllumination()
    ill.fontcolor(255, 255, 0)
    ill.text(0, 0, title);
    ill.text(0, 14, "rolling\naverage")
    ill.fontcolor(255, 255, 255)
    ill.fontsize(25)
    ill.text(0, 50, `${rollingAvg.toFixed(2)}`)
    room.draw(ill)

    });
  } else {
    ill = room.newIllumination()
    ill.text(0, 0, "No data")
    room.draw(ill)

  }
  room.subscriptionPostfix();
})


run();

