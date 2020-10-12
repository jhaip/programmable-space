const { room, myId } = require('../helper2')(__filename);

// DRAW PAPERS
room.on(
  `camera $cameraId sees paper $id at TL ($x1, $y1) TR ($x2, $y2) BR ($x3, $y3) BL ($x4, $y4) @ $time`,
  results => {
    room.cleanup();
    console.log("results:")
    // console.log(results);
    results.forEach(p => {
      if (
        !isNaN(p.x1) && !isNaN(p.y1) &&
        !isNaN(p.x2) && !isNaN(p.y2) &&
        !isNaN(p.x3) && !isNaN(p.y3) &&
        !isNaN(p.x4) && !isNaN(p.y4) &&
        parseInt(p.cameraId) != 99
      ) {
        console.log(p.id)
        const margin = 0; // 0.1;
        const low = margin;
        const high = 1.0 - margin;
        // room.assert(`draw a (255, 255, 1) line from (${low}, ${low}) to (${high}, ${low})`);
        // room.assert(`draw a (255, 255, 1) line from (${high}, ${low}) to (${high}, ${high})`);
        // room.assert(`draw a (255, 255, 1) line from (${high}, ${high}) to (${low}, ${high})`);
        // room.assert(`draw a (255, 255, 1) line from (${low}, ${high}) to (${low}, ${low})`);
        // room.assert(`draw centered label`, ["text", `"What is ${p.id}"`], `at (0.5, 0.5)`);
        room.assert(`draw a (255, 255, 1) line from (${p.x1}, ${p.y1}) to (${p.x2}, ${p.y2})`);
        room.assert(`draw a (255, 255, 1) line from (${p.x2}, ${p.y2}) to (${p.x3}, ${p.y3})`);
        room.assert(`draw a (255, 255, 1) line from (${p.x3}, ${p.y3}) to (${p.x4}, ${p.y4})`);
        room.assert(`draw a (255, 255, 1) line from (${p.x4}, ${p.y4}) to (${p.x1}, ${p.y1})`);
        room.assert(`draw centered label`, ["text", `"What is ${p.id}"`], `at (${(p.x1 + p.x2 + p.x3 + p.x4) / 4.0}, ${(p.y1 + p.y2 + p.y3 + p.y4) / 4.0})`);
      } else {
        console.log(`BAD PAPER ${p.id}`)
      }
    })
  }
)

room.on(
  `camera 1 sees no papers @ $time`,
  results => {
    // this may not do anything because this program might not be running
    // when there are no papers. If it's not running then it can't retract it.
    room.cleanup();
  }
)
