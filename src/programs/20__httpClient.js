const express = require('express')
const bodyParser = require("body-parser");
const cors = require('cors');
const multer  = require('multer');
const { room, myId, scriptName, run } = require('../helpers/helper')(__filename);
const app = express();
const port = 5000;

let data_cache = {};

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('./src/files/web-tablet'))
var storage = multer.diskStorage({   
    destination: (req, file, cb) => cb(null, './src/files/web-tablet'), 
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage: storage }).single("myfile");

app.post('/cleanup-claim', (req, res) => {
    console.error("cleanup-claim")
    console.error(req.body)
    if (Array.isArray(req.body.retract)) {
        req.body.retract.forEach(retraction => {
            room.retractRaw(retraction)
        })
    } else {
        room.retractRaw(req.body.retract)
    }
    if (Array.isArray(req.body.claim)) {
        req.body.claim.forEach(claim => {
            room.assert(claim)
        })
    } else {
        room.assert(req.body.claim)
    }
    room.flush()
    res.status(204).send("");
});

app.get('/select', (req, res) => {
    console.error("select");
    console.error(req);
    console.error(req.query);
    try {
        let subscriptionQuery = JSON.parse(req.query.subscription);
        let subscriptionQueryKey = JSON.stringify(subscriptionQuery);
        let selectResults = [];
        if (subscriptionQueryKey in data_cache) {
            selectResults = data_cache[subscriptionQueryKey];
        } else {
            data_cache[subscriptionQueryKey] = [];
            room.on(...subscriptionQuery,
                results => {
                    console.log(`RESULTS for ${subscriptionQueryKey}:`)
                    console.log(results);
                    data_cache[subscriptionQueryKey] = results;
                }
            )
        }
        if (req.query.first && selectResults.length > 0) {
            res.status(200).send(JSON.stringify(selectResults[0]));    
        } else {
            res.status(200).send(JSON.stringify(selectResults));
        }
    } catch {
        res.status(400).send("could not parse JSON query parameter 'subscription'")
    }
})

app.post('/file', (req, res) => {
    // send image as myfile
    upload(req, res, (err) => {
        if (err) {
            res.status(400).send("Something went wrong!");
        }
        res.send(req.file);
    });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
