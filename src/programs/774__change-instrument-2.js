const { room, myId, scriptName, run } = require('../helpers/helper')(__filename)

room.cleanup()
room.retractAll("instrument is $")
room.assert("instrument is 19")

run()