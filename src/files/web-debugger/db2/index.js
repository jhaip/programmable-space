$refreshButton = document.getElementById("refresh-button");
$selectInput = document.getElementById("select-input");
$results = document.getElementById("results");

$selectInput.value = "%fact";
$refreshButton.onclick = (evt) => {
    evt.preventDefault();
    refresh();
}

function render(data) {
    if (!data || data.length === 0) {
        $results.innerHTML = "<li>No results</li>"
        return
    }
    const mappedData = data.map(function (datum) {
        return `<li>${JSON.stringify(datum)}</li>`
    }).join("\n")
    $results.innerHTML = mappedData;
}

async function refresh() {
    const query = $selectInput.value.trim();
    const squery = JSON.stringify([query]);
    const response = await fetch(`/select?query=${encodeURIComponent(squery)}`);
    const myJson = await response.json();
    render(myJson);
}