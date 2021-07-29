const { room, myId, run } = require('../helpers/helper')(__filename);
const express = require('express');
const request = require('request');
const app = express();

var secretKey = process.env.NOTION_SECRET_KEY || "";
const DELAY_BETWEEN_REQUESTS_MS = 1000 * 60 * 5;
var toReadList = [];

app.get('/', (req, res) => {
    const listString = toReadList.reduce((acc, v) => acc + `<h1>${v.title}</h1>`, '')
    res.send(`
    <!DOCTYPE html>
    <html>
    <head><meta http-equiv="refresh" content="60"></head>
    <body style="background-color:black;color:white;">
    ${toReadList.length > 0
        ? listString
        : '<h1>Nothing to read!</h1>'
    }
    </body>
    </html>
    `);
});
app.get('/list', (req, res) => {
    res.status(200).send(toReadList);
})

const httpPort = 8766;
app.listen(httpPort, () => {
  console.log(`listening http://localhost:${httpPort}`);
});

room.on(`notion secret key is $k`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(({ k }) => {
                secretKey = k;
            });
            fetchReadingListFromNotion();
        }
        room.subscriptionPostfix();
    }
)

function fetchReadingListFromNotion() {
    if (!secretKey) return;
    request(
        {
            uri: `https://api.notion.com/v1/databases/ea55e7b696ad4ee3b6274e7696108814/query`,
            method: 'POST',
            json: true,
            headers: {
                'Notion-Version': '2021-05-13',
                'Authorization': `Bearer ${secretKey}`
            },
            formData: {
              'page_size': 10
            }
        },
        (err, res, body) => {
            room.subscriptionPrefix(2);
            const currentTimeMs = (new Date()).getTime()
            room.assert(`notion to read list updated at ${currentTimeMs}`)
            if (err) {
                room.assert(`notion to read list had error "${err}"`)
                console.log(err);
            } else if (!res || res.statusCode !== 200) {
                room.assert(`notion to read list had error "${res && res.statusCode}"`)
                console.log(res && res.statusCode);
            } else {
                console.log(body);
                console.log(JSON.stringify(body));
                toReadList = body.results.filter(v =>
                  v && v.properties && v.properties.Name && v.properties.Name.title && v.properties.Name.title.length > 0 && v.properties.Name.title[0].plain_text
                ).map(v => {
                  return {
                    title: v.properties.Name.title[0].plain_text,
                    source: v.properties.Source.rich_text.length > 0 ? v.properties.Source.rich_text[0].plain_text : '',
                    addedOn: v.properties['Added on'] ? v.properties['Added on'].date.start : '',
                  }
                })
                console.log(toReadList);
                toReadList.forEach((v, i) => {
                  room.assert(`reading list ${i} is`, ["text", v.title], ["text", v.source], ["text", v.addedOn])
                })
            }
            room.subscriptionPostfix();
            room.flush();
        }
    );
}

setInterval(() => {
    fetchReadingListFromNotion();
}, DELAY_BETWEEN_REQUESTS_MS);

fetchReadingListFromNotion();

run();
