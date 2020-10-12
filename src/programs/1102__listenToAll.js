const { room, myId, run } = require('../helper2')(__filename);

var lastResults = {};

// room.cleanupOtherSource("1102")

function makeKey(x) {
    return `${JSON.stringify(x.source)}${JSON.stringify(x.fact)}`
}

room.onGetSource('source', `%fact`,
    results => {
        if (!!results) {
            console.log(`---------- ${Object.keys(lastResults).length} ${results.length}`)
            results.forEach(({ source, fact }, i) => {
                if (typeof lastResults[makeKey(results[i])] === "undefined") {
                    console.log(`[[[${source}]]]`, `${fact}`.slice(0, 100).replace(/(\r\n|\n|\r)/gm, ""));
                }
            });
            lastResults = {};
            for (let i=0; i<results.length; i+=1) {
                lastResults[makeKey(results[i])] = true;
            };
        }
    })


run();
