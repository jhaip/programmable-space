const { room, myId, run } = require('../helpers/helper')(__filename);

let ill = room.newIllumination()
ill.text(0, 0, "test")
// const base = "/Users/jacobhaip/Downloads/";
// const base = "/home/pi/programmable-space/src/files/";
const base = "/home/jacob/";
ill.video(0, 0, 360*2, 240*2, base + "Big_Buck_Bunny_360_10s_1MB.mp4")
room.draw(ill)




run();
