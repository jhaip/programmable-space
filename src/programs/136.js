const { room, myId, run } = require('../helpers/helper')(__filename);
const fs = require('fs')
const request = require('request')

var latestImgUrl = "";

const download = (url, path, callback) => {
  request.head(url, (err, res, body) => {
    request(url)
      .pipe(fs.createWriteStream(path))
      .on('close', callback)
  })
}

room.on(`button is pressed`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(() => {
                if (latestImgUrl && latestImgUrl.length > 0) {
                    console.log(`downloading img ${latestImgUrl}`)
                    download(latestImgUrl, `src/files/web-tablet/136frame.jpg`, () => {
                        console.log("done downloading. wishing image would be printed");
                        room.assert(`wish 136frame.jpg would be thermal printed on epson`);
                    });
                }
            });
        }
        room.subscriptionPostfix();
    })

room.on(`camera 1994 frame at $frameUrl`,
    results => {
        room.subscriptionPrefix(2);
        if (!!results) {
            results.forEach(({frameUrl}) => {
                latestImgUrl = frameUrl;
            });
        }
        room.subscriptionPostfix();
    })

run();
