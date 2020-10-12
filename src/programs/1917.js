const { room, myId, run } = require('../helper2')(__filename);

var show_bday = false;
var last_time = 0;
var expire_time = 0;

room.on(`microphone heard $x @ $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ x, t }) => {
if (x.includes("happy") && x.includes("birthday")) {
  room.assert(`wish text "Dear special someone,\n\nI hope today is as wonderful as you are!\n\nLove,\nEveryone\n\n" would be thermal printed`)
  room.assert(`wish speaker said "Happy Birthday"`)
  show_bday = true;
  expire_time = last_time + 5;
}

    });
  }
  room.subscriptionPostfix();
})

room.on(`time is $t`,
        results => {
  room.subscriptionPrefix(2);
  if (!!results && results.length > 0) {
    results.forEach(({ t }) => {
if (show_bday) {
  let ill = room.newIllumination()
  ill.translate(300, 200)
  ill.nostroke()
  ill.fill("white")
  ill.ellipse(-50, 250, 500, 100)
  ill.fill(255, 150, 150)
  ill.rect(0, 0, 400, 300)
  for (let i=0; i<4; i+=1) {
    ill.fill(255, 255, 0)
    ill.rect(50+i*90, -100, 20, 100)
    ill.fill("red")
    ill.ellipse(50+i*90, -140, 20, 40) 
  }
  room.draw(ill)
}
if (t >= expire_time) {
  expire_time = 0;
  show_bday = false;
}
last_time = t;

    });
  }
  room.subscriptionPostfix();
})




run();
