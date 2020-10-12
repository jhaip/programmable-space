const { room, myId, run } = require('../helper2')(__filename);

const TARGET_ID = "0648"
var FACTS = {};
var SUBSCRIPTIONS = {};
var nonBootFactSubcriptions = {};
const FONT_SIZE = 9;
const ORIGIN = [0, 0];

function render(id) {
    console.error(FACTS);
    console.error(SUBSCRIPTIONS);
    room.cleanup();
    let ill = room.newIllumination();
    ill.push()
    ill.translate(0, 365);
    ill.rotate(-Math.PI / 2.0)
    ill.fontsize(FONT_SIZE);
    let offset = 0;
    ill.text(ORIGIN[0], ORIGIN[1], `Program #${id}`)
    offset += 2;
    ill.text(ORIGIN[0], (ORIGIN[1] + (offset) * FONT_SIZE * 1.3), `Subscriptions:`)
    ill.fontcolor(255, 255, 0);
    offset += 1;
    for (var key in SUBSCRIPTIONS) {
        let sortedSubscriptions = SUBSCRIPTIONS[key].map(({ subscription }) => subscription).sort();
        sortedSubscriptions.forEach(subscription => {
            ill.text(ORIGIN[0], (ORIGIN[1] + (offset) * FONT_SIZE * 1.3), `${subscription}`);
            offset += 1;
        });
    }
    offset += 1
    ill.fontcolor(255, 255, 255);
    ill.text(ORIGIN[0], (ORIGIN[1] + offset * FONT_SIZE * 1.3), `Claims:`)
    offset += 1
    ill.fontcolor(0, 255, 0);
    for (var key in FACTS) {
        let sortedFacts = FACTS[key].map(({ fact }) => fact).sort();
        sortedFacts.forEach(fact => {
            ill.text(ORIGIN[0], (ORIGIN[1] + (offset) * FONT_SIZE * 1.3), `${fact}`);
            offset += 1;
        });
    }
    ill.pop();
    room.draw(ill);
}

function subscribe(id) {
    room.onRaw(`#${id} $ %fact`, factSubscriptionResult => {
        FACTS[id] = factSubscriptionResult;
        render(id);
    });
    room.onRaw(`subscription #${id} $ $ %subscription`, subscriptionSubscriptionResult => {
        SUBSCRIPTIONS[id] = subscriptionSubscriptionResult;
        render(id);
    });
}

subscribe(TARGET_ID)




run();
