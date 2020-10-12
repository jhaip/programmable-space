const { room, myId, run } = require('../helper2')(__filename);

let mapRegions = []
let locationData = {
'davis sq': [{"name": "Sugidama Soba & Izakaya"}, {"name": "Tenóch Mexican"}, {"name": "Flatbread Pizza"}],
'harvard sq': [{"name": "Longfellow's"}, {"name": "sweetgreen"}, {"name": "El Jefe's Taqueria"}],
'camberville': [{"name": "Oleana"}, {"name": "Bom Café"}, {"name": "Clover"}],
'back bay': [{"name": "La Voile"}, {"name": "Pavement Coffeehouse"}, {"name": "Asta"}],
'downtown': [{"name": "No. 9 Park"}, {"name": "Thinking Cup"}, {"name": "Boston Public Market"}],
'east boston': [{"name": "Downeast Taproom"}, {"name": "La Sultana Bakery"}]
}

room.on(`region $regionId has name $name`,
        results => {
  if (!!results) {
    mapRegions = results.filter(({ name }) => name.includes("map ")).map(({ regionId }) => regionId);
  }
})

room.on(`region $regionId has name $name`,
        `region $regionId is toggled`,
        `laser in region $regionId`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results) {
    results.forEach(({ regionId, name }) => {
      if (!name.includes("map ")) {
        return;
      }
      // Clear other map selections
      mapRegions.forEach(r => {
        if (r !== regionId) {
          console.log(`clearing ${r}`)
          room.retractAll(`region "${r}" is toggled`)
        }
      });
    });
  }
  room.subscriptionPostfix();
})

room.on(`region $regionId has name $name`,
        `region $regionId is toggled`,
        results => {
  room.subscriptionPrefix(2);
  if (!!results) {
    results.forEach(({ regionId, name }) => {
      if (!name.includes("map ")) {
        return;
      }
      // Show location in the selected area
      let mapLocation = name.replace("map ", "")
      let ill = room.newIllumination()
      ill.fontsize(30)
      ill.fontcolor(0, 128, 255)
      ill.text(0, 0, mapLocation)
      if (mapLocation in locationData) {
        ill.fontsize(24)
        ill.fontcolor(255, 255, 255)
        locationData[mapLocation].forEach((loc, locIndex) => {
          ill.text(0, 50 + locIndex * 30, `${locIndex+1}. ${loc.name}`)
        })
      }
      room.draw(ill);
    });
  }
  room.subscriptionPostfix();
})


run();

