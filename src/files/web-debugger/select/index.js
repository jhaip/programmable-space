$(".select-button").click(function () {
    try {
        const query = JSON.parse($(".select-input").val().trim());
        search(query);
    } catch {
        alert("BAD QUERY!");
    }
})

function renderPending() {
    $(".results").html("<li>querying...</li>")
}

function render(data) {
    if (!data || data.length === 0) {
        $(".results").html("<li>No results</li>")
        return
    }
    const mappedData = data.map(function (datum) {
        return `<li>${JSON.stringify(datum)}</li>`
    }).join("\n")
    $(".results").html(mappedData)
}

function search(query) {
    console.log(query);
    renderPending();
    $.ajax({
        type: "POST",
        url: "/select",
        // The key needs to match your method's input parameter (case-sensitive).
        data: JSON.stringify({ "query": query }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (data) {
            console.log(data);
            render(data);
        },
        failure: function (errMsg) {
            render([]);
            alert(errMsg);
        }
    });
}

$(".select-input").val("[\n\"$ camera $cameraId sees paper $id at TL ($x1, $y1) TR ($x2, $y2) BR ($x3, $y3) BL ($x4, $y4) @ $time\"\n]")