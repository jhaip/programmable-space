const { room, myId, scriptName, run } = require('../helper2')(__filename)

room.cleanup()
room.retractAll("melody is $")
room.assert("melody is", ["text", "60,62,64,66,68,66,64,62"])

run()