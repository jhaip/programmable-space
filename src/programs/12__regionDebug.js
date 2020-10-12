const express = require('express')
const bodyParser = require("body-parser");
const fs = require('fs');
const { room, myId, scriptName, run } = require('../helper2')(__filename);
const app = express();
const port = 3011;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('./src/region-editor'))

var regionData = [{
    'id': '9df78dc0-9e97-4a63-851e-b5bd61ba55c6',
    'name': 'pl1health',
    'x1': 20 * 6,
    'y1': 20 * 6,
    'x2': 100 * 6,
    'y2': 20 * 6,
    'x3': 100 * 6,
    'y3': 100 * 6,
    'x4': 20 * 6,
    'y4': 100 * 6,
    'toggleable': true
}];
var newRegionStatus = '';
var highlightAllStatus = false;

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

app.get('/status', (req, res) => {
    res.status(200).send({
        'regions': regionData,
        'new_region_status': newRegionStatus
    });
})

app.delete('/region/:regionId', (req, res) => {
    const regionId = req.params.regionId;
    room.retractAll(`region "${regionId}" %`);
    room.flush();
    res.status(200).send('OK');
})

app.put('/region/:regionId', (req, res) => {
    const regionId = req.params.regionId;
    const data = req.body;
    if (typeof data.name !== "undefined") {
        room.retractAll(`region "${regionId}" has name $`);
        room.assert(`region "${regionId}" has name "${data.name}"`);
    }
    if (typeof data.toggleable !== "undefined") {
        room.retractAll(`region "${regionId}" is toggleable`);
        if (data.toggleable) {
            room.assert(`region "${regionId}" is toggleable`);
        }
    }
    if (typeof data.x1 !== "undefined") {
        room.retractAll(`region "${regionId}" at %`);
        room.assert(`region "${regionId}" at ${data.x1} ${data.y1} ${data.x2} ${data.y2} ${data.x3} ${data.y3} ${data.x4} ${data.y4} on camera`, ["text", "1997"]);
    }
    room.flush();
    res.status(200).send('OK');
})

app.post('/region', (req, res) => {
    let newRegionId = uuidv4();
    room.assertForOtherSource("0", `region "${newRegionId}" at 100 100 600 100 600 600 100 600`)
    room.assertForOtherSource("0", `region "${newRegionId}" has name "TODO"`)
    room.flush();
    res.status(200).send('OK');
})

app.post('/region-mode', (req, res) => {
    const data = req.body;
    room.retractFromSource("0650", "%");
    if (
        data.new_region_status.indexOf("toggle") >= 0 || 
        data.new_region_status.indexOf("region name") >= 0
    ) {
        room.assertForOtherSource("0650", `keyboard "0650" typed special key "enter" @ ${Math.floor((new Date()).getTime() / 1000)}`)
    } else {
        room.assertForOtherSource("0650", `keyboard "0650" typed special key "down" @ ${Math.floor((new Date()).getTime() / 1000)}`)
    }
    room.flush();
    res.status(200).send('OK');
})

app.post('/highlight', (req, res) => {
    room.retractAll(`highlight all regions`);
    if (highlightAllStatus) {
        room.assert(`highlight all regions`);
    }
    highlightAllStatus = !highlightAllStatus;
    room.flush();
    res.status(200).send('OK');
})

room.on(`region $id at $x1 $y1 $x2 $y2 $x3 $y3 $x4 $y4 on camera "1997"`,
    results => {
        room.subscriptionPrefix(2);
        if (!!results) {
            let seenRegions = {};
            results.forEach(result => {
                seenRegions[result.id] = true;
                let regionUpdated = false;
                for (let i = 0; i < regionData.length; i+=1) {
                    if (regionData[i].id === result.id) {
                        regionData[i] = Object.assign(regionData[i], result)
                        regionUpdated = true;
                        break;
                    }
                }
                if (!regionUpdated) {
                    regionData.push(result);
                }
            });
            regionData = regionData.filter(r => !!seenRegions[r.id]);
        }
        room.subscriptionPostfix();
    })

room.on(`region $id is toggleable`,
    results => {
        room.subscriptionPrefix(3);
        if (!!results) {
            let seenRegions = {};
            results.forEach(result => {
                seenRegions[result.id] = true;
                let regionUpdated = false;
                result.toggleable = true;
                for (let i = 0; i < regionData.length; i += 1) {
                    if (regionData[i].id === result.id) {
                        regionData[i] = Object.assign(regionData[i], result)
                        regionUpdated = true;
                        break;
                    }
                }
                if (!regionUpdated) {
                    regionData.push(result);
                }
            });
            regionData = regionData.map(r => {
                return Object.assign(r, {'toggleable': !!seenRegions[r.id] ? r.toggleable : false })
            });
        }
        room.subscriptionPostfix();
    })

room.on(`region $id has name $name`,
    results => {
        room.subscriptionPrefix(4);
        if (!!results) {
            results.forEach(result => {
                let regionUpdated = false;
                for (let i = 0; i < regionData.length; i += 1) {
                    if (regionData[i].id === result.id) {
                        regionData[i] = Object.assign(regionData[i], result)
                        regionUpdated = true;
                        break;
                    }
                }
                if (!regionUpdated) {
                    regionData.push(result);
                }
            });
        }
        room.subscriptionPostfix();
    })

room.onRaw(`#0280 $ draw graphics $graphics on $`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(({ graphics }) => {
                let parsedGraphics = JSON.parse(graphics)
                parsedGraphics.forEach(g => {
                    if (g["type"] === "text") {
                        newRegionStatus = g.options.text;
                    }
                })
            });
        }
        room.subscriptionPostfix();
    })

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
run();