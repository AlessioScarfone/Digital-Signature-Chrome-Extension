console.log("Start...")
/*
   Posso fare un oggetto che al suo interno ha linkate le letie sezioni (il div piu esterno) e 
   accedendo a questo gestisco quale mostrare e quale no. Cosi facendo potrei mantenere lo stesso 
   btn-confirm da aggiornare man mano in base alla sezione attuale
   Poi per ogni sezione posso fare un suo oggetto che gestisce tutti i leti componenti, magari dividendoli in file

   Sezioni:
   1. iniziale, scelta pades (in caso visibile) o cades.
   *. schermata di loading.
   2. cades, pades non visibile -> pass e conferma.
   3. pades visibile. logo o solo testo e usa campo o posiziona firma:
       if CAMPO -> 3.1 seleziona campo, logo se necessario.
       if POS   -> 3.2 seleziona poszione, logo se necessario, pagina e coordinate verticali e orizzontali.


       TODO: aggiungi uno stato al background per memorizzare se c'è gia una firma in corso in modo da ripristinare lo stato 
       del popup al loanding se necessario. Quindi all'apertura del popup leggi lo stato e in caso ripristina al loading 
       o parti dall'inizio 

       FIXME: avvia piu firme consecutive e verifica se le porte vengono correttamente cancellate e riaperte 
       (prova firme multiple dello stesso tipo e mischiate)

   */

var signature_data = {
    type: "",
    filename: "",
    password: "",
    visible: false,
    useField: false,
    verticalPosition: "Bottom",
    horizontalPosition: "Left",
    pageNumber: 1,
    signatureField: ""
    //TODO: add other field
};

var background = chrome.extension.getBackgroundPage();
var popup_message_type = background.popup_message_type;
var _appCurrentState = background.appCurrentState;

class Sections {
    constructor() {
        this._section = {
                first: document.getElementById("step-1"), //start
                second: document.getElementById("step-2"), //cades or pades (no visible)
                third: document.getElementById("step-3"), //visible pades
                loading: document.getElementById("loading"), //loading
                end: document.getElementById("operation-completed")
            },

            this._currentSection = this._section.first;
    }

    get section() {
        return this._section;
    }

    get currentSection() {
        return this._currentSection;
    }

    goback() {
        if (this._currentSection === this._section.second || this._currentSection === this._section.third)
            this.updateSection(this._section.first);
    }

    /**Set the current section with a section in _section property of the object */
    updateSection(nextSection) {
        for (const key in this._section) {
            if (this._section.hasOwnProperty(key)) {
                if (this._section[key] === nextSection) {
                    //hide "old" current section
                    this.hideCurrentSection();
                    this._currentSection = nextSection;
                    //show "old" current section
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


document.addEventListener('DOMContentLoaded', function () {
    var sections = new Sections();
    const signatureTypeBtns = document.querySelectorAll('.signature-type-btns');
    const confirm_btn = document.getElementById("confirm-btn");
    const back_btn = document.getElementById("back-btn");
    const use_visible_signature_switch = document.getElementById("use-visible-signature");
    const use_field_switch = document.getElementById('use-signature-field-checkbox');

    (function checkCurrenState() {
        console.log(_appCurrentState)
        if (_appCurrentState != "start") {
            console.log("App is already in loading.");
            sections.updateSection(sections.section.loading);
            hideConfirmButtonSection();
            // confirm_btn.classList.add('hide');
        }
    }());

    signatureTypeBtns.forEach(el => el.addEventListener('click', selectSignatureTypeEvent));

    function selectSignatureTypeEvent() {
        var el = this;
        signatureTypeBtns.forEach(e => {
            e.classList.add('is-outlined');
            e.classList.remove('is-selected')
        });
        //update state of selected btn
        el.classList.remove('is-outlined');
        el.classList.add('is-selected');
        signature_data.type = el.getAttribute('data-signature-type');

        if (signature_data.type == "pades") {
            // document.getElementById("use-visible-signature").classList.remove('hide');
            el.parentElement.classList.remove("start-trasform-sign-type");
            el.parentElement.classList.add("trasform-sign-type");
            use_visible_signature_switch.classList.remove('start-transform');
            use_visible_signature_switch.classList.add('transform');
        } else { //click on cades
            // document.getElementById("use-visible-signature").classList.add('hide');
            el.parentElement.classList.remove("trasform-sign-type");
            el.parentElement.classList.add("start-trasform-sign-type");
            use_visible_signature_switch.classList.add('start-transform');
            use_visible_signature_switch.classList.remove('transform');
            if (document.getElementById('use-visible-signature-checkbox').checked)
                document.getElementById('use-visible-signature-checkbox').click();

            signature_data.visible = false;
        }

        //after first initializzation active btn confirm
        confirm_btn.disabled = false;
    }

    document.getElementById('use-visible-signature-checkbox').addEventListener("change", function () {
        if (this.checked) {
            signature_data.visible = true;
        } else
            signature_data.visible = false;
    });

    
    use_field_switch.addEventListener("change", function () {
        if (this.checked) {
            signature_data.useField = true;
            document.getElementById('setting-no-field').classList.add('hide');
            document.getElementById('setting-with-field').classList.remove('hide');
            //go in loading and find field
        } else {
            signature_data.useField = false;
            document.getElementById('setting-no-field').classList.remove('hide');
            document.getElementById('setting-with-field').classList.add('hide');
        }
    });

    confirm_btn.addEventListener('click', function () {
        // sections.hideCurrentSection();

        // 1 -> 2 or 3
        if (sections.currentSection == sections.section.first) {
            if (signature_data.type == "cades" || (signature_data.type == "pades" && signature_data.visible == false)) {
                sections.updateSection(sections.section.second);
                back_btn.classList.remove("hidden");
            }
            if (signature_data.type == "pades" && signature_data.visible == true) {
                //TODO: expand for get signature field
                getTabData(getPdfInfo);
                // sections.updateSection(sections.section.third);
                back_btn.classList.remove("hidden");
            }

            console.log("init connection with native app");
            chrome.runtime.sendMessage({
                // action: "init",
                action: popup_message_type.init,
            }, function (response) {
                console.log(response);
            });
        }

        // 2 or 3 -> L
        else if (sections.currentSection == sections.section.second || sections.currentSection == sections.section.third) {
            sections.updateSection(sections.section.loading);
            // confirm_btn.classList.add('hide');
            // back_btn.classList.add("hidden");
            hideConfirmButtonSection();
        }

        confirm_btn.disabled = true;
    });

    back_btn.addEventListener("click", (e) => {
        sections.goback(); //return to first section   
        back_btn.classList.add("hidden"); //hide this btn
        confirm_btn.disabled = false; //active confirm btn (a signature type is already selected)
    })

    var signEventAttached = false

    document.getElementById("pass-1").addEventListener('input', function () {
        if (this.value.length != 0) {
            confirm_btn.disabled = false;
            if (signEventAttached == false) {
                confirm_btn.addEventListener('click', getTabData(sign));
                signEventAttached = true;
            }
        } else {
            confirm_btn.disabled = true;
            confirm_btn.removeEventListener('click', getTabData(sign));
            signEventAttached = false;
        }
    });

    // event for radio button for position of signature 
    document.querySelectorAll("input[type='radio'][name='vert-pos-radio']").forEach((el) => el.addEventListener('click', function () {
        signature_data.verticalPosition = this.value;
    }));

    document.querySelectorAll("input[type='radio'][name='hor-pos-radio']").forEach((el) => el.addEventListener('click', function () {
        signature_data.horizontalPosition = this.value;
    }));

    // function sign() {
    //     signature_data.password = document.getElementById("pass-1").value;
    //     console.log("GET TAB URL...")
    //     chrome.tabs.query({
    //         active: true,
    //         currentWindow: true
    //     }, function (tab) {
    //         var pdfURL = tab[0].url;
    //         console.log(pdfURL);

    //         if (pdfURL.startsWith("file:///")) {
    //             // file is local
    //             pdfURL = pdfURL.substr("file:///".length);
    //             console.log("send message - file is local:");
    //             signature_data.filename = pdfURL;
    //             chrome.runtime.sendMessage({
    //                 // action: "sign",
    //                 action: popup_message_type.sign,
    //                 data: signature_data
    //             }, function (response) {
    //                 console.log(response.ack);
    //             });
    //         } else {
    //             //download pdf and then sign it
    //             console.log("send message:");
    //             chrome.runtime.sendMessage({
    //                 // action: "download_and_sign",
    //                 action: popup_message_type.download_and_sign,
    //                 url: pdfURL,
    //                 data: signature_data
    //             }, function (response) {
    //                 console.log(response.ack);
    //             });
    //         }
    //     });

    // }

    function sign(tabData) {
        signature_data.password = document.getElementById("pass-1").value;
        if (tabData.location == "remote") {
            // download pdf and then sign it
            console.log("send message:");
            chrome.runtime.sendMessage({
                // action: "download_and_sign",
                action: popup_message_type.download_and_sign,
                url: tabData.url,
                data: signature_data
            }, function (response) {
                console.log(response.ack);
            });
        } else if (tabData.location == "local") {
            chrome.runtime.sendMessage({
                action: popup_message_type.sign,
                data: signature_data
            }, function (response) {
                console.log(response.ack);
            });
        }
    }

    function getPdfInfo(tabData) {
        sections.updateSection(sections.section.loading);
        hideConfirmButtonSection();
        if (tabData.location == "remote") {
            chrome.runtime.sendMessage({
                action: popup_message_type.download_and_getInfo,
                url: tabData.url,
                data: signature_data
            }, function (response) {
                // console.log(response);
            });
        }
        if (tabData.location == "local") {
            chrome.runtime.sendMessage({
                action: popup_message_type.info,
                data: signature_data
            }, function (response) {
                // console.log(response);
            });
        }
    }


    function updateSignatureFieldList(fields){
        sections.updateSection(sections.section.third);
        confirm_btn.classList.remove("hide");
        back_btn.classList.remove("hidden");
        console.log(fields);
        console.log(fields.fields);
        if(fields.fields == undefined){
            use_field_switch.disabled = true;
            document.querySelector("#use-signature-field p.has-text-danger").classList.remove("hide");
        }
        //TODO: fill fields list and add canvas
        document.getElementById("page-input").max = fields.page;
        document.getElementById("page-input").placeholder = "0 - "+fields.page;

    }

    function getTabData(callback) {
        console.log("GET TAB URL...")
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function (tab) {
            var pdfURL = tab[0].url;
            console.log(pdfURL);
            var tabData = {};
            if (pdfURL.startsWith("file:///")) {
                // file is local
                pdfURL = pdfURL.substr("file:///".length);
                console.log("send message - file is local:");
                signature_data.filename = pdfURL;
                tabData.location = "local";
            } else {
                tabData.location = "remote";
            }
            tabData.url = pdfURL;
            if (callback)
                callback(tabData);
        });
    }


    //listener message Background -> Popup
    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            console.log(request);
            if (request.hasOwnProperty("state") && request.state == "end") {
                sections.updateSection(sections.section.end);
                // confirm_btn.classList.add('hide');
                hideConfirmButtonSection();
            }
            if (request.hasOwnProperty("state") && request.state == "info") {
                updateSignatureFieldList(request);
            }
            // sendResponse({
            //     ack: "success"
            // });
        });


    function hideConfirmButtonSection() {
        confirm_btn.classList.add('hide');
        back_btn.classList.add("hidden");
    }

});