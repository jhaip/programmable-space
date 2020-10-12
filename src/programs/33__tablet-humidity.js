const { room, myId, run } = require('../helper2')(__filename);

room.on(
    `$photon says the humidity is $humidity and temp is $temp`,
    results => {
        
        // room.cleanup()
        console.log("results:")
        console.log(results)

        room.cleanup();
        if (!results || results.length === 0) {
            room.assert(`wish tablet would show`, ["text", `How humid is it?`])
        } else {
            room.assert(`wish tablet would show`, ["text", `Humidity is ${results[0].humidity}.`])
        }
    }
)

room.assert(`wish tablet would show`, ["text", `How humid is it?`])

run();