const { room, myId, scriptName, run } = require('../helper2')(__filename)

room.cleanup()
room.retractAll("melody is $")
room.assert("melody is", ["text", "50,54,50,50,60"])

run()