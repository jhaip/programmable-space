const { room, myId, run } = require('../helper2')(__filename);

room.cleanup()
let ill = room.newIllumination()
ill.fill(50, 50, 50)
ill.stroke(255, 0, 0)
ill.strokewidth(20)
ill.rect(0, 0, 1280, 720)
room.draw(ill, "web2")





run();
