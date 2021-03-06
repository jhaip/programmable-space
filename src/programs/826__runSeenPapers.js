const { room, myId, scriptName, run } = require('../helpers/helper')(__filename);

room.on(
  `camera $cameraId sees paper $id at TL ( $ , $ ) TR ( $ , $ ) BR ( $ , $ ) BL ( $ , $ ) @ $time`,
  results => {
    room.cleanup();
    (results || []).forEach(result => {
      room.assert(`wish ${String(result.id)} would be running`); 
    });
  }
)
