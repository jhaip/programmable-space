const { room, myId, run } = require('../helper2')(__filename);

var show_circle = true;

room.on(`microphone heard $x @ $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ x, t }) => {

if (x.includes("computer") && x.includes("circle")) {
  if (x.includes("show")) {
    show_circle = true;
    room.assert("wish speaker said", ["text", "showing circle"])
  }
  if (x.includes("hide")) {
    show_circle = false;
    room.assert("wish speaker said", ["text", "goodbye circle"])
  }
}

let ill = room.newIllumination()
if (show_circle) {
  ill.fill("red");
  ill.ellipse(0, 0, 200, 200);
}
room.draw(ill);


    });
  }
  room.subscriptionPostfix();
})


run();
