function selectSignatureType(e) {
    //remove is-selected and add is-outlined to all btn (reset start state)
    $(".signature-type-btns").addClass('is-outlined').removeClass('is-selected');
    //update state of selected btn
    var el = $(this);
    el.addClass('is-selected').removeClass('is-outlined');
    signature_data.type = el.attr('data-signature-type');
    if (signature_data.type == "pades")
        show("use-visible-signature-field");
    else {
        hide("use-visible-signature-field");
        signature_data.visible = false;
    }

    //after first initializzation active btn confirm
    $("#confirm-btn-1").removeAttr("disabled");
}

function hide(id) {
    $("#" + id).addClass("hide");
}

function show(id) {
    $("#" + id).removeClass("hide");
}

function nextStep(nextStepId) {
    var current_step = $('.current-step');
    current_step.addClass("hide").removeClass(".current-step");
    $('#' + nextStepId).removeClass("hide").addClass("current-step");
}