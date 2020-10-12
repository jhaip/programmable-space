const { room, myId, run } = require('../helper2')(__filename);
const sensorOrder = [4, 5, 3, 1];

var lastStack = [];
var turtles = [];
var emitters = [];

room.onRaw(`$ $ ArgonBLE read $value on sensor $sensorId`,
    `$ $ paper $paperNumber has RFID $value`,
    `$ $ paper $paperNumber has id $programId`,
    `$programId $ I am a $cardType card`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            let cards = ["", "", "", ""];
            results.forEach(({ value, sensorId, paperNumber, programId, cardType }) => {
                const cardPosition = sensorOrder.indexOf(sensorId);
                if (cardPosition >= 0) {
                    cards[cardPosition] = cardType;
                }
            });
            let stack = cards.filter(card => card !== "");
            console.log("NEW STACK:")
            console.log(stack);
            if (JSON.stringify(stack) !== JSON.stringify(lastStack)) {
                lastStack = stack;
                turtles = [];
                emitters = [];
                if (stack.length > 0 && stack[0] === "turtle") {
                    const hasSpiral = stack.indexOf("spiral") > 0;
                    const hasTail = stack.indexOf("pen") > 0;
                    const hasRainbowTail = hasTail && stack.indexOf("rainbow") > stack.indexOf("pen");
                    const isRainbow = stack.indexOf("rainbow") > 0 && (!hasTail || stack.indexOf("rainbow") < stack.indexOf("pen"))
                    turtles.push({
                        x: 200 + Math.random() * 800 - 500,
                        y: 200 + Math.random() * 300 - 250,
                        heading: Math.random() * 2.0 * Math.PI,
                        speed: 3,
                        movementType: hasSpiral ? "spiral" : "random",
                        isRainbow: isRainbow,
                        hasRainbowTail: hasRainbowTail,
                        lastRainbowValue: Math.floor(Math.random() * 100),
                        hasTail: hasTail,
                        tail: []
                    });
                } else if (stack.length > 0 && stack[0] === "emitter") {
                    const hasTurtle = stack.indexOf("turtle") > 0;
                    const hasSpiral = stack.indexOf("spiral") > stack.indexOf("turtle");
                    const hasTail = stack.indexOf("pen") > stack.indexOf("turtle");
                    const hasRainbowTail = hasTail && stack.indexOf("rainbow") > stack.indexOf("pen");
                    const isRainbow = stack.indexOf("rainbow") > stack.indexOf("turtle") && (!hasTail || stack.indexOf("rainbow") < stack.indexOf("pen"));
                    emitters.push({
                        x: 200 + Math.random() * 800 - 500,
                        y: 200 + Math.random() * 300 - 250,
                        hasTurtle,
                        hasSpiral,
                        hasTail,
                        isRainbow,
                        hasRainbowTail,
                        turtleEmitCountdown: 10
                    })
                }
            }
        }
        room.subscriptionPostfix();
    })

function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

function rainbow(p) {
    var rgb = HSVtoRGB(p / 100.0 * 0.85, 1.0, 1.0);
    return [rgb.r, rgb.g, rgb.b];
}

setInterval(() => {
    console.log(turtles);
    // update
    for (let i = 0; i < turtles.length; i += 1) {
        if (turtles[i].movementType === "random") {
            turtles[i].heading += -3.0 / (2.0 * Math.PI) + Math.random() * 6.0 / (2.0 * Math.PI);
        } else if (turtles[i].movementType === "spiral") {
            turtles[i].heading += 1.0 / (Math.PI * 2.0);
            turtles[i].speed += 0.2;
        }
        turtles[i].lastRainbowValue += 1;
        if (turtles[i].lastRainbowValue > 100) {
            turtles[i].lastRainbowValue = 0;
        }
        if (turtles[i].hasTail) {
            if (turtles[i].hasRainbowTail) {
                const rainbowColorRGB = rainbow(turtles[i].lastRainbowValue);
                turtles[i].tail.push([
                    turtles[i].x,
                    turtles[i].y,
                    rainbowColorRGB[0],
                    rainbowColorRGB[1],
                    rainbowColorRGB[2]
                ]);
            } else {
                turtles[i].tail.push([turtles[i].x, turtles[i].y, 100, 100, 100]);
            }
            turtles[i].tail = turtles[i].tail.slice(0, 1000); // limits length of tail
        }
        turtles[i].x += turtles[i].speed * Math.cos(turtles[i].heading);
        turtles[i].y += turtles[i].speed * Math.sin(turtles[i].heading);
    }
    for (let i = 0; i < emitters.length; i += 1) {
        if (emitters[i].hasTurtle) {
            emitters[i].turtleEmitCountdown -= 1;
            if (emitters[i].turtleEmitCountdown === 0) {
                turtles.push({
                    x: emitters[i].x,
                    y: emitters[i].y,
                    heading: Math.random() * 2.0 * Math.PI,
                    speed: 3,
                    movementType: emitters[i].hasSpiral ? "spiral" : "random",
                    isRainbow: emitters[i].isRainbow,
                    hasRainbowTail: emitters[i].hasRainbowTail,
                    lastRainbowValue: Math.floor(Math.random() * 100),
                    hasTail: emitters[i].hasTail,
                    tail: []
                });
            }
            if (emitters[i].turtleEmitCountdown < 0) {
                emitters[i].turtleEmitCountdown = 10 + Math.floor(Math.random() * 20);
            }
        }
    }
    // draw
    room.cleanup();
    let ill = room.newIllumination()
    ill.push();
    ill.translate(600, 400);
    for (let i = 0; i < turtles.length; i += 1) {
        for (let t = 0; t < turtles[i].tail.length; t += 1) {
            const tailPoint = turtles[i].tail[t];
            ill.push();
            ill.nostroke();
            ill.fill(tailPoint[2], tailPoint[3], tailPoint[4])
            ill.ellipse(-10 + tailPoint[0], -10 + tailPoint[1], 20, 20);
            ill.pop();
        }
        ill.push();
        ill.translate(turtles[i].x, turtles[i].y);
        ill.nostroke();
        ill.push();
        ill.rotate(turtles[i].heading);
        ill.fill(100, 255, 100);
        ill.ellipse(-10-5, -10-5, 10, 10);
        ill.ellipse(-10-5, 10-5, 10, 10);
        ill.ellipse(10-5, -10-5, 10, 10);
        ill.ellipse(10-5, 10-5, 10, 10);
        ill.ellipse(15-7, -4, 14, 8);
        if (turtles[i].isRainbow) {
            const rainbowColorRGB = rainbow(turtles[i].lastRainbowValue);
            ill.fill(rainbowColorRGB[0], rainbowColorRGB[1], rainbowColorRGB[2])
        } else {
            ill.fill("green")
        }
        ill.ellipse(-15, -15, 30, 30);
        ill.pop();
        ill.pop();
    }
    for (let i = 0; i < emitters.length; i += 1) {
        ill.nostroke();
        ill.fill("white");
        ill.ellipse(emitters[i].x - 10, emitters[i].y - 10, 20, 20);
    }
    ill.pop();
    room.draw(ill, "web2")
    room.flush();
}, 250);


run();
