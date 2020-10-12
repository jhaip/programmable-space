const { room, myId, run } = require('../helper2')(__filename);
const Particle = require('particle-api-js');
const particle = new Particle();

const LOGIN_INFO = { username: 'haipjacob@gmail.com', password: process.env.PARTICLE_PASSWORD };

var token;

function handleRequest(delayValueMs) {
    if (!token) {
        console.log("logging in...")
        particle
            .login(LOGIN_INFO)
            .then(data => {
                token = data.body.access_token;
                console.log("got token", token);
                handleRequest(delayValueMs);
            })
    } else {
        console.log(`Setting value to ${delayValueMs}`);
        particle
            .callFunction({ deviceId: '400035001547343433313338', name: 'setDelayValue', argument: `${delayValueMs}`, auth: token })
            .then(data => {
                console.log('Function called succesfully:', data);
            }, err => {
                console.log('An error occurred:', err);
            })
            .catch(err => {
                console.error("ERROR:")
                console.error(err);
                // TODO: make a claim about the error
            });
    }
}

room.on(
    `wish ribbon moved every $p ms`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(({ p }) => {
                handleRequest(p)
            });
        }
        room.subscriptionPostfix();
    })