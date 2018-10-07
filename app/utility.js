function selectSignatureType(e){
    //remove is-selected and add is-outlined to all btn (reset start state)
    $(".signature-type-btns").addClass('is-outlined').removeClass('is-selected');
    //update state of selected btn
    $(this).addClass('is-selected').removeClass('is-outlined');
    signature_data.type = $(this).attr('data-signature-type');
}