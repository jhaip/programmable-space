const { room, myId, run } = require('../helpers/helper')(__filename);

let ill = room.newIllumination()
ill.fontcolor(255, 0, 0);
ill.text(0, 0, "Hello World!")
room.draw(ill);

run();
