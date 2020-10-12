const { room, myId, scriptName } = require('../helper2')(__filename);

let N = 100
let i = 1

setTimeout(() => {
    room.assert(`Fox is out`)
    room.flush()

    // subscription should be immediately triggered because a matching claim already exists
    room.on(
        `Fox is out`,
        results => {
            console.log("results:")
            console.log(results)
            console.log("Fox is out!")
        }
    )
    setTimeout(() => {
        room.assert(`Fox is out`)
        room.flush()
        setTimeout(() => {
            room.retractMine(`Fox is out`)
            room.flush()
            setTimeout(() => {
                room.assert(`Fox is out`)
                room.flush()
                setTimeout(() => {
                    room.assert(`Fox is out`)
                    room.flush()
                }, 1000);
            }, 1000);
        }, 1000);
    }, 1000);
}, 2000);