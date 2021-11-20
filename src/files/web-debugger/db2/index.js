$refreshButton = document.getElementById("refresh-button");
$selectInput = document.getElementById("select-input");
$results = document.getElementById("results");

$selectInput.value = "$source %fact";
$refreshButton.onclick = (evt) => {
    evt.preventDefault();
    refresh();
}

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
            if (!(d.source in dataBySource)) {
                dataBySource[d.source[1]] = [];
            }
            dataBySource[d.source[1]].push(d.fact);
        });
        Object.keys(dataBySource).forEach(function (source) {
            decodedDataHTML += `<h4>${source}</h4>`
            decodedDataHTML += dataBySource[source].map(function (data) {
                const innerContents = data.map(function (d) {
                    return `<div class="val-type">${d[1]}</div>`
                }).join("")
                return `<li>${innerContents}</li>`
            }).join('\n');
        })
    } else {
        decodedDataHTML = data.map(function (datum) {
            return `<li>${JSON.stringify(datum)}</li>`
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
}