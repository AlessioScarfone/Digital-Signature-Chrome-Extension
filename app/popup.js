console.log("Start...")
/*
       TODO: aggiungi uno stato al background per memorizzare se c'è gia una firma in corso in modo da ripristinare lo stato 
       del popup al loanding se necessario. Quindi all'apertura del popup leggi lo stato e in caso ripristina al loading 
       o parti dall'inizio 
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

const background = chrome.extension.getBackgroundPage();
const popupMessageType = background.popupMessageType;
const appCurrentState = background.appCurrentState;

class Sections {
    constructor() {
        this._section = {
                selectSignatureTypeSection: document.getElementById("select-signature-type-section"), //start
                passwordSection: document.getElementById("pass"), //cades or pades (no visible)
                padesVisibleSection: document.getElementById("pades-visible"), //visible pades
                loadingSection: document.getElementById("loading"), //loading
                endSection: document.getElementById("operation-completed")
            },

            this._currentSection = this._section.selectSignatureTypeSection;
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
    const confirmBtn = document.getElementById("confirm-btn");
    const nextBtn = document.getElementById("next-btn");
    const closeBtn = document.getElementById("close-btn");
    const useVisibleSignatureSwitch = document.getElementById("use-visible-signature");
    const useFieldSwitch = document.getElementById('use-signature-field-checkbox');

    (function checkCurrenState() {
        console.log("App Current State:" + appCurrentState);
        if (appCurrentState == "signing") {
            sections.updateSection(sections.section.loadingSection);
            hideConfirmButtonSection();
        }

        // if (_appCurrentState != "select_type") {
        // console.log("App is already in loading.");
        //     sections.updateSection(sections.section.loading);
        //     hideConfirmButtonSection();
        //     // confirm_btn.classList.add('hide');
        // }
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
            useVisibleSignatureSwitch.classList.remove('start-transform');
            useVisibleSignatureSwitch.classList.add('transform');
        } else { //click on cades
            // document.getElementById("use-visible-signature").classList.add('hide');
            el.parentElement.classList.remove("trasform-sign-type");
            el.parentElement.classList.add("start-trasform-sign-type");
            useVisibleSignatureSwitch.classList.add('start-transform');
            useVisibleSignatureSwitch.classList.remove('transform');
            if (document.getElementById('use-visible-signature-checkbox').checked)
                document.getElementById('use-visible-signature-checkbox').click();

            signature_data.visible = false;
        }

        //after first initializzation active btn next
        nextBtn.disabled = false;
    }

    document.getElementById('use-visible-signature-checkbox').addEventListener("change", function () {
        if (this.checked) {
            signature_data.visible = true;
        } else
            signature_data.visible = false;
    });


    useFieldSwitch.addEventListener("change", function () {
        if (this.checked) {
            signature_data.useField = true;
            document.getElementById('setting-no-field').classList.add('hide');
            document.getElementById('setting-with-field').classList.remove('hide');
            //clear inputs in no-field section
            document.getElementById("page-input").value = "";
            signature_data.signatureField = document.querySelector(".select select").value;
            nextBtn.disabled = false;
        } else { //back to no-field section
            signature_data.useField = false;
            document.getElementById('setting-no-field').classList.remove('hide');
            document.getElementById('setting-with-field').classList.add('hide');
            signature_data.signatureField = "";
            nextBtn.disabled = true;
        }
    });

    confirmBtn.addEventListener('click', () => {
        getTabData(sign);
        sections.updateSection(sections.section.loadingSection);
        hideConfirmButtonSection();
    });

    nextBtn.addEventListener('click', function () {
        // sections.hideCurrentSection();

        // select signature type  -> pass or pades_visible
        if (sections.currentSection == sections.section.selectSignatureTypeSection) {
            if (signature_data.type == "cades" || (signature_data.type == "pades" && signature_data.visible == false)) {
                sections.updateSection(sections.section.passwordSection);
                nextBtn.classList.add("hide");
                confirmBtn.classList.remove("hide");
            }
            if (signature_data.type == "pades" && signature_data.visible == true) {
                //TODO: expand for get signature field
                getTabData(getPdfInfo);
                // sections.updateSection(sections.section.third);
                closeBtn.classList.remove("hidden");
                nextBtn.disabled = true;
            }

            console.log("init connection with native app");
            chrome.runtime.sendMessage({
                // action: "init",
                action: popupMessageType.init,
            }, function (response) {
                console.log("<<< received:")
                console.log(response);
            });
        }

        // pass -> Loading
        else if (sections.currentSection == sections.section.passwordSection) {
            sections.updateSection(sections.section.loadingSection);
            hideConfirmButtonSection();
        }

        // pades_visible -> pass
        else if (sections.currentSection == sections.section.padesVisibleSection) {
            sections.updateSection(sections.section.passwordSection);
            closeBtn.classList.remove("hidden");
            nextBtn.classList.add("hide");
            confirmBtn.classList.remove("hide");
        }

        confirmBtn.disabled = true;
    });

    //close popup
    closeBtn.addEventListener("click", (e) => {
        window.close();
    })

    document.getElementById("pass-1").addEventListener('input', function () {
        if (this.value.length != 0) {
            confirmBtn.disabled = false;
        } else {
            confirmBtn.disabled = true;
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
                action: popupMessageType.download_and_sign,
                url: tabData.url,
                data: signature_data
            }, function (response) {
                console.log("<<< received:")
                console.log(response.ack);
            });
        } else if (tabData.location == "local") {
            chrome.runtime.sendMessage({
                action: popupMessageType.sign,
                data: signature_data
            }, function (response) {
                console.log("<<< received:")
                console.log(response.ack);
            });
        }
    }

    function getPdfInfo(tabData) {
        sections.updateSection(sections.section.loadingSection);
        hideConfirmButtonSection();
        if (tabData.location == "remote") {
            chrome.runtime.sendMessage({
                action: popupMessageType.download_and_getInfo,
                url: tabData.url,
                data: signature_data
            }, function (response) {
                console.log("<<< received:")
                // console.log(response);
            });
        }
        if (tabData.location == "local") {
            chrome.runtime.sendMessage({
                action: popupMessageType.info,
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
        sections.updateSection(sections.section.padesVisibleSection);
        nextBtn.classList.remove("hide");
        nextBtn.disabled = true;
        closeBtn.classList.remove("hidden");
        console.log(fields);
        // console.log(fields.fields);
        if (fields.fields == undefined) {
            useFieldSwitch.disabled = true;
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
            //set zoom to 100%
            chrome.tabs.setZoom(0, function (){console.log("zoom changed")});
            injectContentScript(fields);
        }
        const page_input = document.getElementById("page-input");
        //TODO: add canvas
        page_input.max = fields.page;
        page_input.min = 1;
        page_input.placeholder = "1 - " + (fields.page);
        page_input.addEventListener('input', (e) => {
            signature_data.pageNumber = parseInt(e.target.value);

            if (e.target.checkValidity())
                nextBtn.disabled = false;
            else
                nextBtn.disabled = true;
        });
    }

    function injectContentScript(fields) {
        chrome.storage.local.set({
            fieldsData: fields
        }, function () {});
        chrome.tabs.executeScript({
            file: 'contentScript.js'
        }, function () {});
    }


    //listener message Background -> Popup
    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            console.log("<<< received:")
            console.log(request);

            if (request.hasOwnProperty("state")) {
                switch (request.state) {
                    case "end":
                        sections.updateSection(sections.section.endSection);
                        // confirm_btn.classList.add('hide');
                        hideConfirmButtonSection();
                        break;
                    case "info":
                        updateSignatureFieldList(request);
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
        confirmBtn.classList.add('hide');
        nextBtn.classList.add("hide");
        closeBtn.classList.add("hidden");
    }

});