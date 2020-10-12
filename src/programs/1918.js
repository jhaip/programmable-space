const { room, myId, run } = require('../helper2')(__filename);

const W = 1280;
const H = 720;
const OFFSET = 200;
const S = 10;
let ill = room.newIllumination()
ill.nostroke();
ill.fill(0, 0, 40);
ill.rect(0, 0, W, H);
ill.fill(255, 0, 0);
ill.rect(OFFSET-S, OFFSET-S, S, S);
ill.rect(W-OFFSET-S, OFFSET-S, S, S);
ill.rect(W-OFFSET-S, H-OFFSET-S, S, S);
ill.rect(OFFSET-S, H-OFFSET-S, S, S);
room.draw(ill, "1997")




run();
