const { room, myId, run } = require('../helper2')(__filename);
const request = require('request');

var secretKey = process.env.DARKSKY_SECRET_KEY || "";
const DELAY_BETWEEN_REQUESTS_MS = 1000 * 60 * 5;

room.on(`darksky secret key is $k`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(({ k }) => {
                secretKey = k;
            });
            fetchWeather();
        }
        room.subscriptionPostfix();
    })

function fetchWeather() {
    request(
        `https://api.darksky.net/forecast/${secretKey}/42.3601,-71.0589?exclude=minutely,hourly,alerts,flags`,
        { json: true },
        (err, res, body) => {
            room.subscriptionPrefix(2);
            const currentTimeMs = (new Date()).getTime()
            room.assert(`weather forecast updated at ${currentTimeMs}`)
            if (err) {
                room.assert(`weather forecast had error "${err}"`)
                console.log(err);
            } else if (!res || res.statusCode !== 200) {
                room.assert(`weather forecast had error "${res && res.statusCode}"`)
                console.log(res && res.statusCode);
            } else {
                console.log(body);
                room.assert(`current weather is ${Math.floor(body.currently.temperature)} F and ${body.currently.icon}`)
                body.daily.data.forEach(v => {
                    const dateIsoString = (new Date(v.time * 1000)).toISOString()
                    room.assert(
                        `weather forecast for "${dateIsoString}" is ` +
                        `low ${Math.floor(v.temperatureLow)} F high ${Math.floor(v.temperatureHigh)} F and ` +
                        `${v.icon} with "${Math.floor(100 * v.precipProbability)}%" chance of ${v.precipType}`
                    )
                })
            }
            room.subscriptionPostfix();
            room.flush();
        }
    );
}

setInterval(() => {
    fetchWeather();
}, DELAY_BETWEEN_REQUESTS_MS);

if (secretKey) {
    fetchWeather();
}

run();
