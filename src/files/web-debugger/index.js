var longPollingActive = false;
var latestRequest = 0;
$refreshButton = document.getElementById("refresh-button");
$selectInput = document.getElementById("select-input");
$results = document.getElementById("results");
$longpoll = document.getElementById("longpoll");

$selectInput.value = "$source %fact";
$refreshButton.onclick = (evt) => {
    evt.preventDefault();
    refresh((new Date()).getTime());
}
$longpoll.addEventListener('change', (event) => {
    longPollingActive = !!event.currentTarget.checked;
    if (longPollingActive) {
        refresh((new Date()).getTime());
    }
  })

function render(data) {
    if (!data || data.length === 0) {
        $results.innerHTML = "<li>No results</li>"
        return
    }
    let decodedDataHTML = "";
    const groupBySource = !!data[0].source && !!data[0].fact;
    if (groupBySource) {
        let dataBySource = {};
        data.forEach((d) => {
            const source = d.source[1];
            if (!(source in dataBySource)) {
                dataBySource[source] = [];
            }
            dataBySource[source].push(d.fact);
        });
        Object.keys(dataBySource).forEach(function (source) {
            decodedDataHTML += `<h4>${source}</h4>`
            decodedDataHTML += dataBySource[source].map(function (data) {
                return `<li><div class="val-type">#${source} ${data[1]}</div></li>`
            }).join('\n');
        })
    } else if (!!data[0].fact) {
        decodedDataHTML = data.map(function (datum) {
            return `<li><div class="val-type">${datum.fact[1]}</div></li>`
        }).join("\n")
    } else {
        decodedDataHTML = data.map(function (datum) {
            return `<li><div class="val-type">${JSON.stringify(datum)}</div></li>`
        }).join("\n")
    }
    $results.innerHTML = decodedDataHTML;
}

async function refresh(requestTime) {
    const thisRequestTime = +requestTime;
    latestRequest = +requestTime;
    const query = $selectInput.value.trim();
    const squery = JSON.stringify([query]);
    const response = await fetch(`/select?query=${encodeURIComponent(squery)}`);
    const myJson = await response.json();
    if (latestRequest > thisRequestTime) {
        return; // a newer request is going so throw away these results
    }
    render(myJson);
    if (longPollingActive) {
        setTimeout(function () {
            refresh((new Date()).getTime());
        }, 1000);
    }
}

refresh((new Date()).getTime());