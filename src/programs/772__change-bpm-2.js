const { room, myId, scriptName, run } = require('../helpers/helper')(__filename)

room.cleanup()
room.retractAll("beats per minute is $")
room.assert("beats per minute is 500")

run()