const { room, myId, scriptName, run } = require('../helper2')(__filename)

room.on(
    `paper ${myId} has width $ height $ angle $angleRadians at ( $ , $ )`,
    results => {
        room.cleanup()
        room.retractAll("beats per minute is $")
        try {
            const angleRadians = parseFloat(results[0]["angleRadians"])
            const angleAsPercentageOfRange = (angleRadians + Math.PI) / (2.0 * Math.PI)
            const beatsPerMinuteMin = 30
            const beatsPerMinuteMax = 1000
            const beatsPerMinute = beatsPerMinuteMin + angleAsPercentageOfRange * (beatsPerMinuteMax - beatsPerMinuteMin)
            room.assert(`beats per minute is ${parseInt(beatsPerMinute)}`)
        } catch (e) {
            console.error(e)
        }
    }
)