const express = require('express')
const bodyParser = require("body-parser");
const fs = require('fs');
const { room, myId, scriptName, run } = require('../helper2')(__filename);
const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('./web-debugger'))

app.get('/db', (req, res) => {
    // res.send('Hello World!')
    fs.readFile('./new-backend/go-server/db_view_base64.txt', 'utf8', function (err, contents) {
        console.log(contents);
        const l = contents.split("\n");
        console.log(l);
        res.send(l);
    });
})

app.post('/select', (req, res) => {
    const query_strings = req.body.query;
    let didSendRes = false;
    if (!query_strings) {
        res.status(400).send('Missing query')
    }
    console.log("query strings:");
    
    console.log(query_strings);
    room.on(...query_strings,
        results => {
            console.log("RESULTS:")
            console.log(results);
            // cleanup also removes the subscription in the fact database
            room.cleanup();
            room.flush();
            console.log("sending results:")
            if (!didSendRes) {
                // this is a race condition.
                // didSendRes could have been sent to true after the conditional above
                try {
                    didSendRes = true;
                    res.send(results)
                } catch (err) {
                    console.error("sending timeout response failed...")
                    console.error(err);
                }
            }
        }
    )
    // if no results are returned within 5 seconds, return []
    // no results are returned if there are no matched facts at this time
    setTimeout(() => {
        room.cleanup();
        room.flush();
        if (!didSendRes) {
            // this is a race condition.
            // didSendRes could have been sent to true after the conditional above
            try {
                didSendRes = true;
                res.status(200).send([])
            } catch(err) {
                console.error("sending timeout response failed...")
                console.error(err);
            }
        }
    }, 5000);
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))