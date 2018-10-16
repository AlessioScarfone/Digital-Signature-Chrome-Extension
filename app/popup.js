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
    verticalPosition: "Top",
    horizontalPosition: "Left",
    pageNumber: 1,
    signatureField: "",
    image: ""
};

var background = chrome.extension.getBackgroundPage();
var popup_message_type = background.popup_message_type;
var _appCurrentState = background.appCurrentState;

class Sections {
    constructor() {
        this._section = {
                select_signature_type: document.getElementById("select-signature-type-section"), //start
                pass: document.getElementById("pass"), //cades or pades (no visible)
                pades_visible: document.getElementById("pades-visible"), //visible pades
                loading: document.getElementById("loading"), //loading
                end: document.getElementById("operation-completed")
            },

            this._currentSection = this._section.select_signature_type;
    }

    get section() {
        return this._section;
    }

    get currentSection() {
        return this._currentSection;
    }

    goback() {
        if (this._currentSection === this._section.pass || this._currentSection === this._section.pades_visible)
            this.updateSection(this._section.select_signature_type);
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
    const next_btn = document.getElementById("next-btn");
    const back_btn = document.getElementById("back-btn");
    const use_visible_signature_switch = document.getElementById("use-visible-signature");
    const use_field_switch = document.getElementById('use-signature-field-checkbox');

    (function checkCurrenState() {
        console.log("App Current State:" + _appCurrentState)
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
        next_btn.disabled = false;
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
            //clear inputs in no-field section
            document.getElementById("page-input").value = "";
            signature_data.signatureField = document.querySelector(".select select").value;
            confirm_btn.disabled = false;
        } else {       //back to no-field section
            signature_data.useField = false;
            document.getElementById('setting-no-field').classList.remove('hide');
            document.getElementById('setting-with-field').classList.add('hide');
            signature_data.signatureField = "";
            confirm_btn.disabled = true;
        }
    });

    confirm_btn.addEventListener('click', () => {
        getTabData(sign);
        sections.updateSection(sections.section.loading);
        hideConfirmButtonSection();
    });

    next_btn.addEventListener('click', function () {
        // sections.hideCurrentSection();

        // select signature type  -> pass or pades_visible
        if (sections.currentSection == sections.section.select_signature_type) {
            if (signature_data.type == "cades" || (signature_data.type == "pades" && signature_data.visible == false)) {
                sections.updateSection(sections.section.pass);
                back_btn.classList.remove("hidden");
                next_btn.classList.add("hide");
                confirm_btn.classList.remove("hide");
            }
            if (signature_data.type == "pades" && signature_data.visible == true) {
                //TODO: expand for get signature field
                getTabData(getPdfInfo);
                // sections.updateSection(sections.section.third);
                back_btn.classList.remove("hidden");
                next_btn.disabled = true;
            }

            console.log("init connection with native app");
            chrome.runtime.sendMessage({
                // action: "init",
                action: popup_message_type.init,
            }, function (response) {
                console.log("<<< received:")
                console.log(response);
            });
        }

        // pass -> Loading
        else if (sections.currentSection == sections.section.pass) {
            sections.updateSection(sections.section.loading);
            // confirm_btn.classList.add('hide');
            // back_btn.classList.add("hidden");
            hideConfirmButtonSection();
        }

        // pades_visible -> pass
        else if (sections.currentSection == sections.section.pades_visible) {
            sections.updateSection(sections.section.pass);
            back_btn.classList.remove("hidden");
            next_btn.classList.add("hide");
            confirm_btn.classList.remove("hide");
        }

        confirm_btn.disabled = true;
    });

    back_btn.addEventListener("click", (e) => {
        sections.goback(); //return to first section   
        back_btn.classList.add("hidden"); //hide this btn
        next_btn.classList.remove("hide");
        next_btn.disabled = false; //active confirm btn (a signature type is already selected)
        confirm_btn.disabled = true;
        confirm_btn.classList.add("hide");
    })

    document.getElementById("pass-1").addEventListener('input', function () {
        if (this.value.length != 0) {
            confirm_btn.disabled = false;
        } else {
            confirm_btn.disabled = true;
        }
    });

    // event for radio button for position of signature 
    document.querySelectorAll("input[type='radio'][name='vert-pos-radio']").forEach((el) => el.addEventListener('click', function () {
        signature_data.verticalPosition = this.value;
    }));

    document.querySelectorAll("input[type='radio'][name='hor-pos-radio']").forEach((el) => el.addEventListener('click', function () {
        signature_data.horizontalPosition = this.value;
    }));

    const img_input = document.getElementsByClassName("file-input")[0];
    const reader = new FileReader();
    img_input.addEventListener('change', (e) => {
        img_input.parentNode.parentNode.classList.remove("is-success");
        img_input.disabled = true;
        console.log(img_input.files);
        if (img_input.files.length > 0) {
            // document.getElementById('filename').textContent = img_input.files[0].name;
            var file = event.target.files[0];
            // console.log(event.target.files[0]);

            reader.readAsDataURL(file);
            reader.onloadend = function () {
                base64data = reader.result;
                console.log(base64data);
                signature_data.image = base64data;
                img_input.parentNode.parentNode.classList.add("is-success");
                img_input.disabled = false;
            }
        }
    });

    function sign(tabData) {
        signature_data.password = document.getElementById("pass-1").value;
        console.log("send message sign >>> ");
        if (tabData.location == "remote") {
            // download pdf and then sign it
            chrome.runtime.sendMessage({
                // action: "download_and_sign",
                action: popup_message_type.download_and_sign,
                url: tabData.url,
                data: signature_data
            }, function (response) {
                console.log("<<< received:")
                console.log(response.ack);
            });
        } else if (tabData.location == "local") {
            chrome.runtime.sendMessage({
                action: popup_message_type.sign,
                data: signature_data
            }, function (response) {
                console.log("<<< received:")
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
                console.log("<<< received:")
                // console.log(response);
            });
        }
        if (tabData.location == "local") {
            chrome.runtime.sendMessage({
                action: popup_message_type.info,
                data: signature_data
            }, function (response) {
                console.log("<<< received:")
                // console.log(response);
            });
        }
    }


    function getTabData(callback) {
        console.log("GET TAB URL...")
        var tabData = {};

        //check if file is already downloaded for get pdf info
        if (signature_data.filename != "" && !signature_data.filename.startsWith("http") && !signature_data.filename.startsWith("file")) {
            tabData.location = "local";
            tabData.url = signature_data.filename;
            if (callback)
                callback(tabData);
        } else {
            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, function (tab) {
                var pdfURL = tab[0].url;
                console.log(pdfURL);
                if (pdfURL.startsWith("file:///")) {
                    // file is local
                    pdfURL = pdfURL.substr("file:///".length);
                    console.log("File is local:");
                    console.log(pdfURL);
                    signature_data.filename = pdfURL;
                    tabData.location = "local";
                } else {
                    tabData.location = "remote";
                }
                tabData.url = pdfURL;
                console.log(tabData);
                if (callback)
                    callback(tabData);
            });
        }
    }

    function updateSignatureFieldList(fields) {
        sections.updateSection(sections.section.pades_visible);
        next_btn.classList.remove("hide");
        next_btn.disabled = true;
        back_btn.classList.remove("hidden");
        console.log(fields);
        // console.log(fields.fields);
        if (fields.fields == undefined) {
            use_field_switch.disabled = true;
            document.querySelector("#use-signature-field p.has-text-danger").classList.remove("hide");
        } else {
            //create list of signable fields
            let parent = document.querySelector("#setting-with-field .select select");
            fields.fields.forEach(el => {
                // console.log(el);
                let node = document.createElement("option");
                let text = document.createTextNode(el.name);
                node.appendChild(text);
                parent.appendChild(node);
            });
        }
        const page_input = document.getElementById("page-input");
        //TODO: add canvas
        page_input.max = fields.page + 1;
        page_input.min = 1;
        page_input.placeholder = "1 - " + (fields.page + 1);
        page_input.addEventListener('input', (e) => {
            signature_data.pageNumber = parseInt(e.target.value);

            if (e.target.checkValidity())
                next_btn.disabled = false;
            else
                next_btn.disabled = true;

        });

    }


    //listener message Background -> Popup
    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            console.log("<<< received:")
            console.log(request);


            if (request.hasOwnProperty("state")) {
                switch (request.state) {
                    case "end":
                        sections.updateSection(sections.section.end);
                        // confirm_btn.classList.add('hide');
                        hideConfirmButtonSection();
                        break;
                    case "info":
                        updateSignatureFieldList(request);
                        break;
                    case "update":
                        //update signature
                        signature_data = request.data;
                        break;

                    default:
                        break;
                }
            }

            // sendResponse({
            //     ack: "success"
            // });
        });


    function hideConfirmButtonSection() {
        confirm_btn.classList.add('hide');
        next_btn.classList.add("hide");
        back_btn.classList.add("hidden");
    }

});