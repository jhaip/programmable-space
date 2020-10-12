const { room, myId, run } = require('../helper2')(__filename);

let N = 100
let i = 1

room.on(
    `$X ${myId} has $Y toes`,
    results => {
        room.cleanup()
        console.log("results:")
        console.log(results)
        i += 1;
        if (i >= N) {
            console.log("\n...DONE!")
            process.exit(0);
        }
        room.assert(`Man ${myId} has ${i} toes`)
        room.assert(`Man ${myId} has ${i} toes`)
        room.assert(`Hello`, ["text", "world"], "$")
    }
)

room.assert(`Man ${myId} has 0 toes`)
room.assert(`Hello`, ["text", "world"], "$")

run();