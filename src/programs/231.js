const { room, myId, run } = require('../helper2')(__filename);

data = []
size = 18

room.onRaw(`$ $ paper ${myId} is pointing at paper $id`,
           `$ $ paper $id has id $fullId`,
           `$fullId $ $name is $value`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(({ id, fullId, name, value }) => {
                data.push(value)
                data = data.slice(-size)
                room.assert(`"${id}'s ${name}" data is "${data.toString()}"`)
            });
            let ill = room.newIllumination()
            ill.fontsize(8)
            for (let i=0; i<data.length; i+=1) {
                ill.text(0, i*12, `${data[i]}`)
            }
            room.draw(ill)
        }
        room.subscriptionPostfix();
    })


run();
