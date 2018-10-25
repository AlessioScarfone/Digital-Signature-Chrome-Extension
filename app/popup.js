console.log("Start...")

/**
 * TODO: add text of loading
 */

var signatureData = {
    type: "",
    filename: "",
    password: "",
    visible: false,
    useField: false,
    verticalPosition: "Top",
    horizontalPosition: "Left",
    pageNumber: 1,
    signatureField: "",
    image: "",

    /**
     * Reset signature data.
     */
    empty: function () {
        this.type = "";
        this.filename = "";
        this.password = "";
        this.visible = false;
        this.useField = false;
        this.verticalPosition = "Top";
        this.horizontalPosition = "Left";
        this.pageNumber = 1;
        this.signatureField = "";
        this.image = "";
    },

    copy: function (data) {
        this.type = data.type;
        this.filename = data.filename;
        this.password = data.password;
        this.visible = data.visible;
        this.useField = data.useField;
        this.verticalPosition = data.verticalPosition;
        this.horizontalPosition = data.horizontalPosition;
        this.pageNumber = data.pageNumber;
        this.signatureField = data.signatureField;
        this.image = data.image;
    }
};


class Sections {
    constructor() {
        this._section = {
                selectSignatureTypeSection: document.getElementById("select-signature-type-section"), //start
                passwordSection: document.getElementById("pass"), //cades or pades (no visible)
                padesVisibleSection: document.getElementById("pades-visible"), //visible pades
                loadingSection: document.getElementById("loading"), //loading
                endSection: document.getElementById("operation-completed"), //operation complete
                errorSection: document.getElementById("error-section") //error section
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
    changeSection(nextSection) {
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
        console.error("changeSection: No valid section");
    }

    hideCurrentSection() {
        this._currentSection.classList.add('hide');
    };
}


document.addEventListener('DOMContentLoaded', function () {
    chrome.runtime.sendMessage({
        "action": "wakeup"
    }, function (response) {

        const background = chrome.extension.getBackgroundPage();
        const popupMessageType = background.popupMessageType;
        let appCurrentState = background.appCurrentState;
        const appStateEnum = background.StateEnum;
        const backgroundStoredSignatureData = background.storedSignatureData;

        var sections = new Sections();
        const signatureTypeBtns = document.querySelectorAll('.signature-type-btns');
        const confirmBtn = document.getElementById("confirm-btn");
        const nextBtn = document.getElementById("next-btn");
        const closeBtn = document.getElementById("close-btn");
        const clearBtn = document.getElementById("clear-btn");
        const useVisibleSignatureSwitch = document.getElementById("use-visible-signature");
        const useFieldSwitch = document.getElementById('use-signature-field-checkbox');
        const passfield = document.getElementById("password-field");

        const loadingMsg = document.getElementById("loading-info");
        const errorMsg = document.getElementById("error-info");

        (function checkCurrenState() {
            // console.log("App Current State:" + appCurrentState);
            if (appCurrentState == undefined) {
                clearData();
            }
            if (appCurrentState == appStateEnum.loading) {
                console.log("LOADING");
                // sections.changeSection(sections.section.loadingSection);
                loading("Loading ...");
            } else if (appCurrentState == appStateEnum.complete || appCurrentState == appStateEnum.error) {
                clearData();
            }
            //check if exist stored data in background
            else if (appCurrentState == appStateEnum.running) {
                // console.log(backgroundStoredSignatureData);
                if (backgroundStoredSignatureData.isEmpty() == false) {
                    console.log("NEED TO RESTORE DATA");
                    // signatureData = backgroundStoredSignatureData.signatureData;
                    signatureData.copy(backgroundStoredSignatureData.signatureData);
                    updateSignatureFieldList(backgroundStoredSignatureData.infoPDF);
                }
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
            signatureData.type = el.getAttribute('data-signature-type');

            if (signatureData.type == "pades") {
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

                signatureData.visible = false;
            }

            //after first initializzation active btn next
            nextBtn.disabled = false;
        }

        document.getElementById('use-visible-signature-checkbox').addEventListener("change", function () {
            if (this.checked) {
                signatureData.visible = true;
            } else
                signatureData.visible = false;
        });


        useFieldSwitch.addEventListener("change", function () {
            if (this.checked) {
                signatureData.useField = true;
                document.getElementById('setting-no-field').classList.add('hide');
                document.getElementById('setting-with-field').classList.remove('hide');
                //clear inputs in no-field section
                document.getElementById("page-input").value = "";
                signatureData.signatureField = document.querySelector(".select select").value;
                nextBtn.disabled = false;
            } else { //back to no-field section
                signatureData.useField = false;
                document.getElementById('setting-no-field').classList.remove('hide');
                document.getElementById('setting-with-field').classList.add('hide');
                signatureData.signatureField = "";
                nextBtn.disabled = true;
            }
        });

        confirmBtn.addEventListener('click', () => {
            getTabData(sign);
            loading("Signing process ...");
            // sections.changeSection(sections.section.loadingSection);
        });

        nextBtn.addEventListener('click', function () {
            // select signature type  -> pass or pades_visible
            if (sections.currentSection == sections.section.selectSignatureTypeSection) {
                //cades or not visible pades
                if (signatureData.type == "cades" || (signatureData.type == "pades" && signatureData.visible == false)) {
                    sections.changeSection(sections.section.passwordSection);
                    nextBtn.classList.add("hide");
                    confirmBtn.classList.remove("hide");
                }
                //pades visible
                if (signatureData.type == "pades" && signatureData.visible == true) {
                    getTabData(getPdfInfo);
                    //UI updated by updateSignatureFieldList
                }

                console.log("init connection with native app");
                chrome.runtime.sendMessage({
                    action: popupMessageType.init,
                }, function (response) {
                    // console.log("<<< received:")
                    // console.log(response);
                });
            }

            // pades_visible -> pass
            else if (sections.currentSection == sections.section.padesVisibleSection) {
                sections.changeSection(sections.section.passwordSection);
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

        //close popup and clean stored data in background
        clearBtn.addEventListener("click", (e) => {
            clearData();
        });

        function clearData() {
            backgroundStoredSignatureData.empty();
            signatureData.empty();

            signatureTypeBtns.forEach(el => {
                el.classList.add('is-outlined');
                el.classList.remove('is-selected');
                el.parentElement.classList.remove("trasform-sign-type");
                el.parentElement.classList.add("start-trasform-sign-type");
            });
            document.getElementById('use-visible-signature-checkbox').checked = false;
            useVisibleSignatureSwitch.classList.add('start-transform');
            useVisibleSignatureSwitch.classList.remove('transform');

            closeBtn.classList.remove("hidden");
            nextBtn.classList.remove("hide");

            clearBtn.classList.add("hidden");
            nextBtn.disabled = true;
            //go to first section
            sections.changeSection(sections.section.selectSignatureTypeSection);

            chrome.runtime.sendMessage({
                action: popupMessageType.resetState
            }, function (response) {
                appCurrentState = response.appstate;
                // console.log("<<< received:")
                // console.log(response.ack);
            });

            // window.close();
        }


        passfield.addEventListener('input', function () {
            if (this.value.length != 0) {
                confirmBtn.disabled = false;
            } else {
                confirmBtn.disabled = true;
            }
        });

        // event for radio button for position of signature 
        document.querySelectorAll("input[type='radio'][name='vert-pos-radio']").forEach((el) => el.addEventListener('click', function () {
            signatureData.verticalPosition = this.value;
        }));

        document.querySelectorAll("input[type='radio'][name='hor-pos-radio']").forEach((el) => el.addEventListener('click', function () {
            signatureData.horizontalPosition = this.value;
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
                    signatureData.image = base64data;
                    img_input.parentNode.parentNode.classList.add("is-success");
                    img_input.disabled = false;
                }
            }
        });

        function sign(tabData) {
            signatureData.password = passfield.value;
            console.log("send message sign >>> ");
            if (tabData.location == "remote") {
                // download pdf and then sign it
                chrome.runtime.sendMessage({
                    // action: "download_and_sign",
                    action: popupMessageType.download_and_sign,
                    url: tabData.url,
                    data: signatureData
                }, function (response) {
                    console.log("<<< received:")
                    console.log(response.ack);
                });
            } else if (tabData.location == "local") {
                chrome.runtime.sendMessage({
                    action: popupMessageType.sign,
                    data: signatureData
                }, function (response) {
                    console.log("<<< received:")
                    console.log(response.ack);
                });
            }
        }

        function getPdfInfo(tabData) {
            loading("Retrieve information from PDF ...");
            // sections.changeSection(sections.section.loadingSection);
            if (tabData.location == "remote") {
                chrome.runtime.sendMessage({
                    action: popupMessageType.download_and_getInfo,
                    url: tabData.url,
                    data: signatureData
                }, function (response) {
                    // console.log("<<< received:")
                    // console.log(response);
                });
            }
            if (tabData.location == "local") {
                chrome.runtime.sendMessage({
                    action: popupMessageType.info,
                    data: signatureData
                }, function (response) {
                    // console.log("<<< received:")
                    // console.log(response);
                });
            }
        }


        function getTabData(callback) {
            console.log("GET TAB URL...")
            var tabData = {};

            //check if file is already downloaded for get pdf info
            if (signatureData.filename != "" && !signatureData.filename.startsWith("http") && !signatureData.filename.startsWith("file")) {
                tabData.location = "local";
                tabData.url = signatureData.filename;
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
                        signatureData.filename = pdfURL;
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
            sections.changeSection(sections.section.padesVisibleSection);
            nextBtn.classList.remove("hide");
            nextBtn.disabled = true;
            closeBtn.classList.remove("hidden");
            clearBtn.classList.remove("hidden");
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
                chrome.tabs.setZoom(0, function () {
                    console.log("zoom changed")
                });
                injectContentScript(fields);
            }

            const page_input = document.getElementById("page-input");
            page_input.max = fields.page;
            page_input.min = 1;
            page_input.placeholder = "1 - " + (fields.page);
            page_input.addEventListener('input', (e) => {
                signatureData.pageNumber = parseInt(e.target.value);
                if (e.target.checkValidity())
                    nextBtn.disabled = false;
                else
                    nextBtn.disabled = true;
            });
        }

        function injectContentScript(fields) {
            //ask to background to create a zoom change listener
            chrome.tabs.query({
                active: true
            }, function (tab) {
                // console.log(tab[0]);
                chrome.runtime.sendMessage({
                    // action: "init",
                    action: popupMessageType.zoom,
                    tabid: tab[0].id
                }, function (response) {
                    console.log("<<< received:")
                    console.log(response);
                });

                //set data for content script
                chrome.storage.local.set({
                    fieldsData: fields
                }, function () {});

                //run content script
                chrome.tabs.executeScript({
                    file: 'contentScript.js'
                }, function () {});

            });
        }

        function hideConfirmButtonSection() {
            confirmBtn.classList.add('hide');
            nextBtn.classList.add("hide");
            closeBtn.classList.add("hidden");
            clearBtn.classList.add("hidden");
        }

        function endSectionUIUpdate(localFilePath) {
            console.log(localFilePath);
            hideConfirmButtonSection();
            const completeInfo = document.getElementById("complete-info");
            completeInfo.classList.remove("hide");
            completeInfo.textContent = "File created: " + localFilePath;
        }

        function loading(message) {
            hideConfirmButtonSection();
            loadingMsg.textContent = message;
            sections.changeSection(sections.section.loadingSection);
        }

        function showError(error) {
            errorMsg.textContent = error;
            sections.changeSection(sections.section.errorSection);
            clearBtn.classList.remove("hidden");
        }

        //listener message Background -> Popup
        chrome.runtime.onMessage.addListener(
            function (request, sender, sendResponse) {
                console.log("<<< received:")
                console.log(request);

                if (request.hasOwnProperty("state")) {
                    switch (request.state) {
                        case "end":
                            sections.changeSection(sections.section.endSection);
                            endSectionUIUpdate(request.localPath);
                            break;
                        case "info":
                            updateSignatureFieldList(request);
                            break;
                        case "error":
                            showError(request.error);
                            break;

                        default:
                            break;
                    }
                }

                // sendResponse({
                //     ack: "success"
                // });
            });






    });
});