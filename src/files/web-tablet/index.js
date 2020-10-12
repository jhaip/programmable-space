function renderText(data) {
    if (!data || data.length === 0) {
        $(".results").html("No results")
        return
    }
    try {
        let text = JSON.parse(data)[0].text;
        $(".results").html(text);
    } catch {
        $(".results").html("error parsing");
    }
}
function renderBackground(data) {
    if (!data || data.length === 0) {
        $("body").css('background-color', `rgb(0, 0, 0)`);
        return
    }
    try {
        let color = JSON.parse(data)[0];
        $("body").css('background-color', `rgb(${color.r}, ${color.g}, ${color.b})`);
    } catch {
        $("body").css('background-color', `rgb(255, 0, 0)`);
    }
}

function textUpdate() {
    $.ajax({
        type: "GET",
        url: "/select",
        data: {
            subscription: JSON.stringify(["$ wish tablet would show $text"])
        },
        success: function (data) {
            console.log(data);
            renderText(data);
            setTimeout(textUpdate, 2000);
        },
        failure: function (errMsg) {
            renderText([]);
            alert(errMsg);
            setTimeout(textUpdate, 2000);
        }
    });
}

function backgroundColorUpdate() {
    $.ajax({
        type: "GET",
        url: "/select",
        data: {
            subscription: JSON.stringify(["$ wish tablet had background color ( $r , $g , $b )"])
        },
        success: function (data) {
            console.log(data);
            renderBackground(data);
            setTimeout(backgroundColorUpdate, 2000);
        },
        failure: function (errMsg) {
            renderBackground([]);
            alert(errMsg);
            setTimeout(backgroundColorUpdate, 2000);
        }
    });
}

textUpdate();
backgroundColorUpdate();