const { room, myId, run } = require('../helpers/helper')(__filename);

room.onRaw(`$ $ paper ${myId} is pointing at paper $id`,
           `$ $ paper $id has id $fullId`,
           `$fullId $ $title data is $x`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ title, x }) => {
    data = x.toString().split(" , ").map(v => parseFloat(v))
    ill = room.newIllumination()
    ill.nostroke()
    ill.fill(200, 100, 100)
    data.forEach((d, i) => {
      ill.rect(0, 10*i, d, 10)
    })
    ill.translate(20, 0)
    ill.rotate(Math.PI/2.0)
    ill.text(0, 0, title);
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
