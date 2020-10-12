const BASE_ID = 2000;
const N = 10;

for (var i = BASE_ID; i < BASE_ID + N; i += 1) {
    $("select").append(`<option value="${i}">${i}</option>`)
}

function claimNewEditTarget(editTargetId) {
    $.ajax({
        type: "POST",
        url: "/cleanup-claim",
        data: {
            claim: `paper 1013 is pointing at paper ${editTargetId}`,
            retract: `$ paper 1013 is pointing at paper $`
        },
        success: function () { console.log("success") },
        failure: function (errMsg) { console.log(errMsg) }
    });
}

$('select').on('change', function () {
    claimNewEditTarget(this.value);
});

claimNewEditTarget(BASE_ID);