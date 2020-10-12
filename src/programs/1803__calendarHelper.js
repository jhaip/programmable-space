const { room, myId, run } = require('../helper2')(__filename);

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
var calendarCalibration = null;

function getWeekNum(d) {
    let monthDayNumber = d.getDate();
    let firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
    let firstDayDayOfWeek = firstDay.getDay();
    let weekNum = Math.floor((monthDayNumber + firstDayDayOfWeek - 1) / 7);
    return weekNum;
}

room.on(`calendar $ calibration for $displayId is $M1 $M2 $M3 $M4 $M5 $M6 $M7 $M8 $M9`,
    results => {
        if (!!results && results.length > 0) {
            calendarCalibration = results[0];
        }
    }
)

room.on(`wish calendar day $dateString was highlighted with color $color`,
    results => {
        room.subscriptionPrefix(1);
        if (!!results) {
            results.forEach(({ dateString, color }) => {
                if (!calendarCalibration) {
                    console.log("missing calendar calibration");
                    return;
                }
                let date = new Date(Date.parse(dateString))
                let dateWithoutTimezone = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000)
                let dayOfWeek = dateWithoutTimezone.getDay()
                let weekOfMonth = getWeekNum(dateWithoutTimezone)
                let ill = room.newIllumination()
                ill.set_transform(
                    calendarCalibration.M1, calendarCalibration.M2, calendarCalibration.M3,
                    calendarCalibration.M4, calendarCalibration.M5, calendarCalibration.M6,
                    calendarCalibration.M7, calendarCalibration.M8, calendarCalibration.M9,
                )
                ill.nostroke();
                ill.fill(color)
                ill.rect(
                    dayOfWeek * Math.floor(CANVAS_WIDTH / 7),
                    weekOfMonth * Math.floor(CANVAS_HEIGHT / 5),
                    Math.floor(CANVAS_WIDTH / 7),
                    Math.floor(CANVAS_HEIGHT / 5)
                )
                room.draw(ill, calendarCalibration.displayId)

            });
        }
        room.subscriptionPostfix();
    })


room.on(`laser at calendar $x $y @ $t`,
    results => {
        room.subscriptionPrefix(2);
        if (!!results) {
            results.forEach(({ x, y, t }) => {
                if (!calendarCalibration) {
                    console.log("missing calendar calibration");
                    return;
                }
                let ill = room.newIllumination()
                ill.set_transform(
                    calendarCalibration.M1, calendarCalibration.M2, calendarCalibration.M3,
                    calendarCalibration.M4, calendarCalibration.M5, calendarCalibration.M6,
                    calendarCalibration.M7, calendarCalibration.M8, calendarCalibration.M9,
                )
                ill.nostroke();
                ill.fill("orange")
                ill.rect(
                    x * Math.floor(CANVAS_WIDTH / 7),
                    y * Math.floor(CANVAS_HEIGHT / 5),
                    Math.floor(CANVAS_WIDTH / 7),
                    Math.floor(CANVAS_HEIGHT / 5)
                )
                room.draw(ill, calendarCalibration.displayId)

            });
        }
        room.subscriptionPostfix();
    })


run();
