const { room, myId, run } = require('../helper2')(__filename);

room.cleanup()
let S = 150
let petals = 7
let ill = room.newIllumination()
ill.push()
ill.translate(500, 400)
ill.nofill()
ill.strokewidth(4)
ill.stroke("white")
for (let i=0; i<petals; i+=1) {
  let r = i*Math.PI*2.0/petals
  let x = S*Math.cos(r)
  let y = S*Math.sin(r)
  ill.ellipse(x-S/2,y-S/2,S,S)
}
ill.nostroke()
ill.fill("orange")
ill.ellipse(-S, -S, S*2, S*2)
ill.pop()
room.draw(ill, "web2")




run();
