const {room, myId, scriptName, run} = require('../helper2')(__filename)

room.cleanup()
room.assert("melody is", ["text", "60,62,64,66,68,66,64,62"])
// room.assert("melody is", ["text", ""])
room.assert("beats per minute is 212")
room.assert("instrument is 100")

run()