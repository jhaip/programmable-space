const { room, myId, run } = require('../helper2')(__filename);

const maxValue = 100.0;

room.onRaw(`$ $ paper ${myId} is pointing at paper $id`,
           `$ $ paper $id has id $fullId`,
           `$fullId $ $name is $value`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(({ id, fullId, name, value }) => {
                let ill = room.newIllumination()
                let points = []
                let steps = 20;
                let radius = 40;
                for (let k=0; k<=steps; k+=1) {
                    let a = Math.PI - k * Math.PI / steps
                    points.push([radius * Math.cos(a), - radius * Math.sin(a)])
                }
                ill.text(0, 0, `${name}`)
                ill.translate(radius, radius + 20)
                ill.nofill()
                ill.stroke(255, 255, 255)
                ill.polygon(points.concat([points[0]]))
                ill.fill(0, 255, 0)
                ill.stroke(0, 255, 0)
                let p = Math.floor(steps * parseFloat(value) / maxValue)
                p = Math.max(0, Math.min(steps, p))
                ill.polygon(points.slice(0, p).concat([[0,0], points[0]]))
                ill.text(-radius, 5, "0")
                ill.text(radius, 5, `${maxValue}`)
                room.draw(ill)
            });
        }
        room.subscriptionPostfix();
    })


run();

