const { room, myId, run } = require('../helper2')(__filename);

let count = 0;
room.globalAssert(`count is 0`)

room.on(`circuit playground "BUTTON_A" has value 1`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({  }) => {

room.retractAll(`count is $`)
count += 1;
room.globalAssert(`count is ${count}`)


    });
  }
  room.subscriptionPostfix();
})




run();
