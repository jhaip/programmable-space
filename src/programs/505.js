const { room, myId, run } = require('../helpers/helper')(__filename);

room.cleanup();
room.assert("x wish RGB light strand is color 0 0 0");

room.on(`weather forecast for $timestamp is low $low F high $high F and $weather with $p chance of rain`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            let willRainToday = false;
            results.forEach(({ timestamp, low, high, weather, p }) => {
                console.log(weather);
                const isTomorrow = (new Date()).getDate() === (new Date(timestamp)).getDate();
                if (isTomorrow && weather.includes("rain")) {
                  willRainToday = true;
                }
            });
            if (willRainToday) {
                room.cleanup();
                room.assert("x wish RGB light strand is color 0 0 20");
            }
        }
        room.subscriptionPostfix();
    })

run();
