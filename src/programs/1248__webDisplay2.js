const express = require('express')
const enableWs = require('express-ws')
const bodyParser = require("body-parser");
const fs = require('fs');
const { room, myId, scriptName, run } = require('../helper2')(__filename);
const app = express();
const port = 3014;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('./src/web-display'))
const expressWs = enableWs(app)

var graphicsCache = [];
var calibration = null;
var calendarRegion = null;

app.get('/status', (req, res) => {
    res.status(200).send({
        'calibration': calibration,
        'graphics': graphicsCache,
        'calendarRegion': calendarRegion
    });
})

app.ws('/echo', (ws, req) => {
    ws.on('message', msg => {
        console.log("received message");
    })

    ws.on('close', () => {
        console.log('WebSocket was closed')
    })
})

room.on(
    `region $id at $x1 $y1 $x2 $y2 $x3 $y3 $x4 $y4`,
    `region $id has name calibration`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(({ x1, y1, x2, y2, x3, y3, x4, y4 }) => {
                calibration = [x1, y1, x2, y2, x3, y3, x4, y4];
            });
            expressWs.getWss().clients.forEach(client => {
                client.send(JSON.stringify({
                    'calibration': calibration,
                    'graphics': graphicsCache,
                    'calendarRegion': calendarRegion
                }));
            });
        }
        room.subscriptionPostfix();
    })


room.on(
    `region $id at $x1 $y1 $x2 $y2 $x3 $y3 $x4 $y4`,
    `region $id has name calendar`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(({ x1, y1, x2, y2, x3, y3, x4, y4 }) => {
                calendarRegion = [x1, y1, x2, y2, x3, y3, x4, y4];
            });
            expressWs.getWss().clients.forEach(client => {
                client.send(JSON.stringify({
                    'calibration': calibration,
                    'graphics': graphicsCache,
                    'calendarRegion': calendarRegion
                }));
            });
        }
        room.subscriptionPostfix();
    })

room.on(`draw graphics $graphics on web2`,
    results => {
        room.subscriptionPrefix(2);
        if (!!results) {
            graphicsCache = [];
            results.forEach(({ graphics }) => {
                let parsedGraphics = JSON.parse(graphics)
                graphicsCache = graphicsCache.concat(parsedGraphics);
            });
            expressWs.getWss().clients.forEach(client => {
                client.send(JSON.stringify({
                    'calibration': calibration,
                    'graphics': graphicsCache,
                    'calendarRegion': calendarRegion
                }));
            })
        }
        room.subscriptionPostfix();
    })

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
run();
