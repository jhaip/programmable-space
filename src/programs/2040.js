const { room, myId, run } = require('../helpers/helper')(__filename);

room.onRaw(`$ $board soil is $t`, results => {
if (results && results.length > 0) {
  room.cleanup()
  results.sort((a,b) => (a.board > b.board) ? 1 : -1);
  let ill = room.newIllumination()
  ill.fontsize(150)
  ill.text(0, 0, 'SOIL:')
  ill.translate(100,100);
  ill.scale(3,3);
  results.forEach(({t, board}, i) => {
    //ill.text(0, 250 + i * 250, `${board}: ${t}`)
    drawFace(ill, (t > 100) ? 2 : 1);
    ill.translate(200, 0);
  });
  room.draw(ill)
}
});

function drawFace(ill, level) {
  ill.push();
  ill.nostroke();
  if(level==2) {
    ill.fill(0,200,0);
  } else { ill.fill(200,0,0); }
  ill.translate(75, 75);
  ill.ellipse(-75, -75, 150, 150);
  ill.stroke(0,0,0);
  ill.strokewidth(5);
  ill.line(20,-30,20,-10);
  ill.line(-20,-30,-20,-10);  
  if (level ==2 ) {
    ill.line(-30,20, -10, 40);
    ill.line(-10, 40 ,10, 40);
    ill.line(10,40, 30, 20);
  } else {
    ill.line(-30, 20, 30, 20);
  }
  ill.pop()
}



run();
