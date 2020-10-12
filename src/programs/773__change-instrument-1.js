const { room, myId, scriptName, run } = require('../helper2')(__filename)

room.cleanup()
room.retractAll("instrument is $")
room.assert("instrument is 100")

run()