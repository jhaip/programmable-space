const express = require('express')
const enableWs = require('express-ws')
const bodyParser = require("body-parser");
const fs = require('fs');
const { room, myId, scriptName, run } = require('../helpers/helper')(__filename);
const app = express();
const port = 3012;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('./src/files/web-display'))
const expressWs = enableWs(app)

var graphicsCache = [];

app.get('/status', (req, res) => {
    res.status(200).send({'graphics': graphicsCache});
})

app.ws('/echo', (ws, req) => {
    ws.on('message', msg => console.log("received message"))
    ws.on('close', () => console.log('WebSocket was closed'))
})

room.on(`draw graphics $graphics on web`,
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
                    'graphics': graphicsCache
                }));
            })
        }
        room.subscriptionPostfix();
    })

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
run();
