const { room, myId, run } = require('../helper2')(__filename);

const filterFunc = v => v % 2 ? v : 0

room.onRaw(`$ $ paper ${myId} is pointing at paper $id`,
           `$ $ paper $id has id $fullId`,
           `$fullId $ $name data is $values`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            let data = []
            results.forEach(({ id, fullId, name, values }) => {
                if (typeof values === 'string') {
                data = values.split(" , ").map(filterFunc)
                room.assert(`"${name}" data is "${data.toString()}"`)
                }
            });
            let ill = room.newIllumination()
            ill.fontsize(8);
            ill.fontcolor(255, 0, 0)
            ill.text(0, 0, filterFunc.toString().replace("v => ", ""))
            ill.fontcolor(255, 255, 255)
            for (let i=0; i<data.length; i+=1) {
                ill.text(0, 12+i*12, `${data[i]}`)
            }
            room.draw(ill)
        }
        room.subscriptionPostfix();
    })


run();
