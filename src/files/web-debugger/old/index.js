let longPollingActive = true;

function updateLongPolling(newValue) {
    if (newValue && !longPollingActive) {
        poll();
    }
    longPollingActive = newValue;
    if (longPollingActive) {
        $(".long-poll-button").addClass("long-poll-button--active")
    } else {
        $(".long-poll-button").removeClass("long-poll-button--active")
    }
}

$(".long-poll-button").click(function () {
    updateLongPolling(!longPollingActive);
})

function b64DecodeUnicode(str) {
    // Going backwards: from bytestream, to percent-encoding, to original string.
    return decodeURIComponent(atob(str).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

function poll() {
    $.get("/db", function (data) {
        if (!longPollingActive) {
            return;
        }
        // console.log(data)
        const lastValSlice = data.slice(-1)
        if (lastValSlice.length === 1 && lastValSlice[0] == "") {
            data = data.slice(0, -1)
        }
        // console.log(data)
        var decodedData = data.map(function (datum) {
            // console.log(datum);
            const parsedDatum = JSON.parse(datum).map(function (d) {
                if (d[0] === "text") {
                    return [d[0], b64DecodeUnicode(d[1])]
                }
                return d;
            });
            return parsedDatum;
        })
        // console.log(decodedData)
        // var decodedData = data.map(b64DecodeUnicode)
        var dataJoinedBySource = {}
        decodedData.forEach(function (data) {
            var firstWord = data[0][1]; // value of the first datum
            if (!(firstWord in dataJoinedBySource)) {
                dataJoinedBySource[firstWord] = []    
            }
            dataJoinedBySource[firstWord].push(data)
        })
        // console.log(decodedData)

        var decodedDataHTML = ""
        Object.keys(dataJoinedBySource).forEach(function (source) {
            decodedDataHTML += `<h4>${source}</h4>`
            decodedDataHTML += dataJoinedBySource[source].map(function (data) {
                const innerContents = data.map(function (d) {
                    return `<div class="val-type val-type--${d[0]}">${d[1]}</div>`
                }).join("")
                return `<li>${innerContents}</li>`
            }).join('\n');
        })
        $(".results").html(decodedDataHTML);

        if (longPollingActive) {
            setTimeout(function () {
                poll();
            }, 1000);
        }
    });
}

poll();