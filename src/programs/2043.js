const { room, myId, run } = require('../helper2')(__filename);

var T = ""
var S = "";
var F = {}; 

function render() {
   room.cleanup();
   let ill = room.newIllumination()
   ill.stroke(255, 0, 0);
   ill.fill(0, 0, 0);
   ill.rect(20, 20, 800, 60);
   ill.fontsize(60);
   if (T === "") {
     ill.fontcolor(100, 100, 100);
   } else {
     ill.fontcolor(255, 255, 255);
   }
   ill.text(20, 20, T || "type something");
   console.log("-");
   console.log(F);
   ill.fontsize(20);
   ill.fontcolor(200, 255, 200);
  for (let key in F) {
    for (let i=0; i<F[key].length; i+=1) {
      ill.text(20, 100+i*24, `${F[key][i]}`)
    }
  }
   room.draw(ill);
}

room.on(`keyboard $ typed key $k @ $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ k, t }) => {
T = T + k;
render();

    });
  }
  room.subscriptionPostfix();
})

room.on(`keyboard $ typed special key $k @ $t`,
        results => {
  room.subscriptionPrefix(2);
  if (!!results && results.length > 0) {
    results.forEach(({ k, t }) => {
if (k === "enter") {
  if (!isNaN(T)) {
    console.log("is not NaN!");
    let id = (+T).toString().padStart(4, '0') 
    console.log(`ID: "${id}"`);
    F = {[id]: []};
    room.onRaw(`#${id} %fact`, sr => {
      if (id in F) {
        F[id] = (F[id] || []).concat(JSON.stringify(sr)).slice(-10);
        render();
      }
    });
  }
  T = "";
} else if (k === "backspace") {
  T = T.slice(0, -1);
} else if (k === "space") {
  T  = T + " ";
}
render();


    });
  }
  room.subscriptionPostfix();
})


run();
