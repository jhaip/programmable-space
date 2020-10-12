const { room, myId, run } = require('../helper2')(__filename);

const BOILERPLATE = `
from helper2 import init
import time
from adafruit_crickit import crickit

init(__file__, skipListening=True)

motor_1 = crickit.dc_motor_1
motor_2 = crickit.dc_motor_2
speed_1 = 0.4
speed_2 = speed_1

def move(c1, c2, t):
    motor_1.throttle = speed_1 * c1
    motor_2.throttle = speed_2 * c2
    time.sleep(t)
    motor_1.throttle = 0
    motor_2.throttle = 0
    time.sleep(0.1)

move(0, 0, 1)
`;

const forward_time = 0.8;
const turn_time = 0.61;
const tile_code = {
  'up': (s,n) => `${s}move(1, 1, ${forward_time})\n`.repeat(n),
  'down': (s,n) => `${s}move(-1, -1, ${forward_time})\n`.repeat(n),
  'left': (s,n) => `${s}move(-1, 1, ${turn_time})\n`.repeat(n),
  'right': (s,n) => `${s}move(1, -1, ${turn_time})\n`.repeat(n),
  'loopstart': (s,n) => `${s}for i in range(${n}):\n`,
  'loopstop': (s,n) => `\n`,
  'stop': (s,n) => `${s}move(0, 0, 1)\n`
}
const W = 6
const H = 8
let code = "";


room.on(`tile $tile seen at $x $y @ $t`,
        results => {
  room.cleanup()
  if (!results) return
  let list = Array(W*H).fill("")
  results.forEach(({ tile, x, y, t}) => {
    list[+x + W * (+y)] = tile;
  });
  code = BOILERPLATE;
  stack_level = 0;
  list.forEach((tile, i) => {
    if (tile !== "" && tile in tile_code) {
      if (tile === 'loopstop') {
        if (stack_level <= 0) {
          return;
        } else {
          stack_level -= 1;
        }
      }
      let indent = " ".repeat(4 * stack_level);
      let N = 1;
      let maybe_number_tile = list[i+W] // look at tile 1 row below
      if (maybe_number_tile !== "" && parseInt(maybe_number_tile) > 0) {
        N = parseInt(maybe_number_tile)
      }
      code += (tile_code[tile])(indent, N);
      if (tile === 'loopstart') {
        stack_level += 1;
      }
    }
  });
  while (stack_level > 0) {
    code += "\n";
    stack_level -= 1;
  }
  code += tile_code['stop']("", 1);
  room.assert(`block code`, ["text", code], `wip`)

})

room.on(`button was pressed @ $t`,
        results => {
  room.subscriptionPrefix(2);
  if (!!results) {
    results.forEach(({ t }) => {
  room.assert(`wish`, ["text", code], `runs on robot`)


    });
  }
  room.subscriptionPostfix();
})


run();
