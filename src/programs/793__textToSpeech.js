const spawn = require('child_process').spawn;
const { room, myId, run, MY_ID_STR, getIdFromProcessName, getIdStringFromId } = require('../helper2')(__filename);

room.onGetSource('wisherId',
    `wish speaker said $text`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results && results.length > 0) {
            results.forEach(({ wisherId, text }) => {
                runArgs = ["-voice", "rms", "-t", text]
                console.log(runArgs)
                const child = spawn('flite', runArgs)
                console.log("done")
                room.retractFromSource(wisherId, `wish speaker said $`)
            });
        }
        room.subscriptionPostfix();
    })

run();
