const { room, myId, run, MY_ID_STR } = require('../helper2')(__filename);

var FACTS = {};
var SUBSCRIPTIONS = {};
var nonBootFactSubcriptions = {};
const FONT_SIZE = 16;
const ORIGIN = [20, 20];

function render() {
    console.error(FACTS);
    console.error(SUBSCRIPTIONS);
    room.cleanup();
    let ill = room.newIllumination();
    ill.fontsize(FONT_SIZE);
    let offset = 0;

    let programDetails = {}; // {"programId": {"claims": [], "listens": []}, ...}
    for (var programId in SUBSCRIPTIONS) {
        let sortedSubscriptions = SUBSCRIPTIONS[programId].map(({ subscription }) => subscription).sort();
        programDetails[programId] = {"claims": [], "listens": sortedSubscriptions}
    }
    for (var programId in FACTS) {
        let sortedFacts = FACTS[programId].map(({ fact }) => fact).sort();
        if (!(programId in programDetails)) {
            programDetails[programId] = {"claims": [], "listens": []}
        }
        programDetails[programId]["claims"] = sortedFacts;
    }
    Object.keys(programDetails).sort().forEach(programId => {
        if (
            programDetails[programId]["listens"].length === 0 &&
            programDetails[programId]["claims"].length === 0
        ) {
            return;
        }
        ill.fontcolor(255, 255, 255);
        ill.text(ORIGIN[0], (ORIGIN[1] + (offset) * FONT_SIZE * 1.3), `#${programId}`);
        offset += 1;
        ill.fontcolor(255, 100, 100);
        programDetails[programId]["listens"].forEach(subscription => {
            ill.text(ORIGIN[0], (ORIGIN[1] + (offset) * FONT_SIZE * 1.3), `    when ${subscription.slice(6)}`);
            offset += 1;
        });
        ill.fontcolor(100, 255, 100);
        programDetails[programId]["claims"].forEach(fact => {
            ill.text(ORIGIN[0], (ORIGIN[1] + (offset) * FONT_SIZE * 1.3), `    claim ${fact.slice(3)}`);
            offset += 1;
        });
        offset += 0.5; // half space for padding between programs
    });
    room.draw(ill);
}

function subscribe(id) {
    room.onRaw(`#${id} %fact`, factSubscriptionResult => {
        FACTS[id] = factSubscriptionResult;
        render();
    });
    room.onRaw(`subscription #${id} $ %subscription`, subscriptionSubscriptionResult => {
        SUBSCRIPTIONS[id] = subscriptionSubscriptionResult;
        render();
    });
}

function checkRunningPaper(paperId) {
    const id = paperId.toString().padStart(4, '0');
    if (["2042", "1101"].indexOf(id) >= 0) {
        return; // skip the masterlist replicators
    }
    if (nonBootFactSubcriptions[id] !== "SUBSCRIBED" && id !== MY_ID_STR) {
        nonBootFactSubcriptions[id] = "SUBSCRIBED";
        subscribe(id);
    }
}

room.onRaw(`#0045 $ wish $paperId would be running`, results => {
    (results || []).forEach(result => checkRunningPaper(result.paperId))
})

room.on(
    `camera $camId sees paper $id at TL ( $ , $ ) TR ( $ , $ ) BR ( $ , $ ) BL ( $ , $ ) @ $time`,
    results => {
        console.error("seeing non-boot papers:")
        console.error(results)
        for (let i=0; i<results.length; i+=1) {
            if (results[i].camId.toString() !== "99") {
                checkRunningPaper(results[i].id);
            }
        }
    }
)

// circuit playground proxy is run manually
nonBootFactSubcriptions['1192'] = "SUBSCRIBED";
subscribe('1192');
nonBootFactSubcriptions['1193'] = "SUBSCRIBED";
subscribe('1193');

run()
