const { room, myId, run } = require('../helper2')(__filename);

board = []
W = 26
H = 26
BOARD_WIDTH_CELLS = 6
BOARD_HEIGHT_CELLS = 8

const illb = room.newIllumination()
illb.push()
illb.rotate(Math.PI/2.0)
illb.translate(0, -H*8)
illb.nofill()
illb.stroke(128, 128, 128)
illb.rect(0, 0, W*BOARD_WIDTH_CELLS, H*BOARD_HEIGHT_CELLS)
for (let i=0; i<BOARD_WIDTH_CELLS; i+=1) {
  illb.line(i*W, 0, i*W, H*BOARD_HEIGHT_CELLS)
}
for (let i=0; i<BOARD_HEIGHT_CELLS; i+=1) {
  illb.line(0, i*H, W*BOARD_WIDTH_CELLS, i*H)
}
illb.pop()
room.draw(illb)
const tile_color = {
  "up": [100, 200, 0],
  "down": [100, 200, 0],
  "right": [100, 200, 0],
  "left": [100, 200, 0],
  "loopstop": [0, 100, 0],
  "loopstart": [0, 100, 0],
}
const tile_name = {
  "up": "↑",
  "down": "↓",
  "right": "→",
  "left": "←",
  "loopstop": "☑",
  "loopstart": "✓",
}

room.on(`tile $tile seen at $x $y @ $t`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ tile, x, y, t }) => {
    room.assert(`wish`)
    let ill = room.newIllumination()
    ill.push()
    ill.rotate(Math.PI/2.0)
    ill.translate(0, -H*8)
    if (tile in tile_color) {
        c = tile_color[tile]
        ill.fill(c[0], c[1], c[2])
    } else {
        ill.fill(100, 150, 255)
    }
    ill.rect(x*W, y*H, W, H)
    if (tile in tile_name) {
      ill.fontsize(H)
      ill.fontcolor(255, 255, 255)
      ill.text(x*W + W*0.15, y*H - H*0.4, tile_name[tile])
    } else {
      ill.fontsize(W/(1+tile.length))
      ill.fontcolor(255, 255, 255)
      ill.text(x*W + W*0.15, y*H + H*0.1*tile.length, tile)
    }
    ill.pop()
    room.draw(ill)


    });
  }
  room.subscriptionPostfix();
})


run();
