const { room, myId, run } = require('../helper2')(__filename);

let W = 1280
let H = 720

function render(x, y, lowF) {
    let ill = room.newIllumination()
    ill.fontcolor(255, 255, 255)
    ill.text(x*W/7+20, y*H/5+20, `${lowF}'`);
    room.draw(ill, "web2")
}

function getWeekNum(d) {
    let monthDayNumber = d.getDate();
    let firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
    let firstDayDayOfWeek = firstDay.getDay();
    let weekNum = Math.floor((monthDayNumber + firstDayDayOfWeek - 1) / 7);
    return weekNum;
}

room.on(`weather forecast for $dateString is low $lowF F high $highF F and $weatherType with $pctRain chance of rain`,
        results => {
  room.subscriptionPrefix(1);
  if (!!results && results.length > 0) {
    results.forEach(({ dateString, lowF, highF, weatherType, pctRain }) => {
  let date = new Date(Date.parse(dateString))
  let dateWithoutTimezone = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000)
  let dayOfWeek = dateWithoutTimezone.getDay()
  let weekOfMonth = getWeekNum(dateWithoutTimezone)
  if (dateWithoutTimezone.getMonth() === (new Date()).getMonth()) {
    render(dayOfWeek, weekOfMonth, lowF)
  }


    });
  }
  room.subscriptionPostfix();
})


run();
