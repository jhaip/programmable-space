const { room, myId, run } = require('../helpers/helper')(__filename);

let ill = room.newIllumination()
ill.nostroke()
ill.fill(200, 200, 128)
ill.rect(0, 0, 1024, 600)
ill.fontcolor(0, 0, 0)
ill.fontsize(60)
ill.text(20, 20, "Muffins")
ill.fontsize(20)
ill.text(20, 100, "2 Cups Flour")
ill.text(20, 125, "3 teaspoons baking powder")
ill.text(20, 150, "1/2 teaspoon salt")
ill.text(20, 175, "3/4 cup white sugar")
ill.text(20, 200, "1 egg")
ill.text(20, 225, "1 cup milk")
ill.text(20, 250, "1/4 cup vegetable oil")
room.draw(ill)




run();
