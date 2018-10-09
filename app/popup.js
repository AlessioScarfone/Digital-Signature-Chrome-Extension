console.log("Start...")

var signature_data = {
    type: "",
    filename: "",
    password: "",
    visible: false,
    verticalPosition: "Bottom",
    horizontalPosition: "Left",
    pageNumber: 1,
    signatureField: ""
    //TODO add other field
};

class Sections {
    constructor() {
        this._section = {
                first: document.getElementById("step-1"),
                second: document.getElementById("step-2"),
                third: document.getElementById("step-3")
            },

            this._currentSection = this._section.first;
    }

    get section() {
        return this._section;
    }

    get currentSection() {
        return this._currentSection;
    }

    /**Set the current section with a section in _section property of the object */
    updateSection(nextSection) {
        for (const key in this._section) {
            if (this._section.hasOwnProperty(key)) {
                if (this._section[key] === nextSection) {
                    this._currentSection = nextSection;
                    this._currentSection.classList.remove('hide');
                    return;
                }
            }
        }
        console.error("UpdateCurrentSection: No valid section");
    }

    hideCurrentSection() {
        this._currentSection.classList.add('hide');
    };
}

/*
   Posso fare un oggetto che al suo interno ha linkate le varie sezioni (il div piu esterno) e 
   accedendo a questo gestisco quale mostrare e quale no. Cosi facendo potrei mantenere lo stesso 
   btn-confirm da aggiornare man mano in base alla sezione attuale
   Poi per ogni sezione posso fare un suo oggetto che gestisce tutti i vari componenti, magari dividendoli in file

   Sezioni:
   1. iniziale, scelta pades (in caso visibile) o cades.
   *. schermata di loading.
   2. cades, pades non visibile -> pass e conferma.
   3. pades visibile. logo o solo testo e usa campo o posiziona firma:
       if CAMPO -> 3.1 seleziona campo, logo se necessario.
       if POS   -> 3.2 seleziona poszione, logo se necessario, pagina e coordinate verticali e orizzontali.
   */

document.addEventListener('DOMContentLoaded', function () {

    var sections = new Sections();

    var signatureTypeBtns = document.querySelectorAll('.signature-type-btns');
    var confirm_btn = document.getElementById("confirm-btn");
    signatureTypeBtns.forEach(el => el.addEventListener('click', selectSignatureTypeEvent))

    function selectSignatureTypeEvent() {
        var el = this;
        console.log("click: ");
        console.log(el);
        signatureTypeBtns.forEach(e => {
            e.classList.add('is-outlined');
            e.classList.remove('is-selected')
        });
        //update state of selected btn
        el.classList.remove('is-outlined');
        el.classList.add('is-selected');
        signature_data.type = el.getAttribute('data-signature-type');

        if (signature_data.type == "pades")
            show("use-visible-signature-field");
        else {
            hide("use-visible-signature-field");
            signature_data.visible = false;
        }

        //after first initializzation active btn confirm
        confirm_btn.disabled = false;
    }

    document.getElementById('use-visible-signature-checkbox').addEventListener("change", function () {
        if (this.checked) {
            console.log("changed");
            signature_data.visible = true;
        } else
            signature_data.visible = false;
    });

    confirm_btn.addEventListener('click', function () {
        console.log(sections.section);
        sections.hideCurrentSection();
        if (signature_data.type == "cades" || (signature_data.type == "pades" && signature_data.visible == false))
            sections.updateSection(sections.section.second);
        if (signature_data.type == "pades" && signature_data.visible == true) {
            sections.updateSection(sections.section.third);
        }
        confirm_btn.disabled = true;
    });


    // $("#pass-1").on('input', function () {
    //     console.log($(this).val().length);
    //     if ($(this).val().length != 0) {
    //         confirm_btn_2.removeAttr("disabled");
    //     } else {
    //         confirm_btn_2.prop("disabled", true);
    //     }
    // });

    // $('#pades-btn').on('click', run);

});