var longPollingActive = false;
$refreshButton = document.getElementById("refresh-button");
$selectInput = document.getElementById("select-input");
$results = document.getElementById("results");
$longpoll = document.getElementById("longpoll");

$selectInput.value = "$source %fact";
$refreshButton.onclick = (evt) => {
    evt.preventDefault();
    refresh();
}
$$longpoll.addEventListener('change', (event) => {
    if (event.currentTarget.checked) {
        longPollingActive = true;
        refresh();
    } else {
        longPollingActive = true;
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
                return `<li><div class="val-type">${source} ${data[1]}</div></li>`
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

async function refresh() {
    const query = $selectInput.value.trim();
    const squery = JSON.stringify([query]);
    const response = await fetch(`/select?query=${encodeURIComponent(squery)}`);
    const myJson = await response.json();
    render(myJson);
    if (longPollingActive) {
        setTimeout(function () {
            refresh();
        }, 1000);
    }
}

refresh();