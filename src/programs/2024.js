const { room, myId, run } = require('../helpers/helper')(__filename);

room.cleanup()
let ill = room.newIllumination()
ill.fill("green")
ill.rect(0, 0, 1920, 1080)
room.draw(ill, "1998")





run();
