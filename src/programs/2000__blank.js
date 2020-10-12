const { room, myId, run } = require('../helper2')(__filename);

room.cleanup()

function drawFace(ill, current_time) {
ill.push()
ill.translate(0, 50 + 50 * Math.sin(current_time/5.0))
ill.fill("blue")
ill.nostroke()
let face_width=100
let face_height=100
let eye_size = 10
ill.ellipse(0, 0, face_width, face_height);
ill.fill("white")
ill.ellipse(face_width/4, face_height/3, eye_size, eye_size);
ill.ellipse(face_height*3/4.0, face_height/3, eye_size, eye_size);
let mouth_y = face_height*0.6
ill.stroke("yellow")
ill.line(face_width/5, mouth_y, face_width*4.0/5.0, mouth_y);
ill.pop()
}

room.on(`time is $time`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ time }) => {
  room.cleanup()
  let ill = room.newIllumination();
  drawFace(ill, time);
  room.draw(ill);

    });
  }
  room.subscriptionPostfix();
})


run();
