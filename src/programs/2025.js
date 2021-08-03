const { room, myId, run } = require('../helpers/helper')(__filename);

room.cleanup()
// draw a flower
// let S = 150
// let petals = 7
// let ill = room.newIllumination()
// ill.push()
// ill.translate(500, 400)
// ill.nofill()
// ill.strokewidth(4)
// ill.stroke("white")
// for (let i=0; i<petals; i+=1) {
//   let r = i*Math.PI*2.0/petals
//   let x = S*Math.cos(r)
//   let y = S*Math.sin(r)
//   ill.ellipse(x-S/2,y-S/2,S,S)
// }
// ill.nostroke()
// ill.fill("orange")
// ill.ellipse(-S, -S, S*2, S*2)
// ill.pop()
// room.draw(ill, "1998")

room.on(`reading list $i is $title $source $addedOn`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            let ill = room.newIllumination()
            ill.fontcolor("white");
            let fontsize = 40;
            ill.fontsize(fontsize);
            ill.nostroke();
            results.forEach(({ i, title, source, addedOn }) => {
                ill.push()
                ill.translate(Math.floor(Math.random() * 500), Math.floor(Math.random() * 400));
                let r = 50 + Math.floor(Math.random() * 150);
                let g = 50 + Math.floor(Math.random() * 150);
                let b = 50 + Math.floor(Math.random() * 150);
                let w = title.length * fontsize * 0.6;
                ill.fill(r, g, b);
                ill.rect(20, 0, w+50, 100);
                ill.fill(r*0.8, g*0.8, b*0.8);
                ill.rect(0, 0, 20, 100);
                ill.text(30, 30, `${title}`);
                ill.pop()
            });
            room.draw(ill, "1998")
        }
        room.subscriptionPostfix();
    })




run();
