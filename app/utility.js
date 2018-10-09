function hide(id) {
    document.getElementById(id).classList.add("hide");
}

function show(id) {
    document.getElementById(id).classList.remove("hide");
}

function nextStep(nextStepId) {
    var current_step = $('.current-step');
    current_step.addClass("hide").removeClass(".current-step");
    $('#' + nextStepId).removeClass("hide").addClass("current-step");
}