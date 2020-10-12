const fs = require('fs');
const { room, myId, scriptName, run } = require('../helper2')(__filename);

room.assert('wish', ["text", "1900__processManager.js"], 'would be running')

room.onGetSource('wisherId',
    `wish $sourceCode runs on robot`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(({ sourceCode }) => {
                const currentTargetName = '106__robotCode.py';
                room.assert(
                    `wish`, ["text", currentTargetName],
                    `has source code`, ["text", sourceCode]);
                // claim it's not running to force the paper to be killed
                // so the source code change is used when it starts again
                let postCompiledTargetName = currentTargetName.replace(".prejs", ".js");
                room.retractAll(
                    `wish`, ["text", postCompiledTargetName], `would be running`
                )
                setTimeout(() => {
                    room.assert(`wish`, ["text", postCompiledTargetName], `would be running`)
                    room.flush();
                }, 2000);
            });
        }
        room.subscriptionPostfix();
    }
);
