console.log("Start...")
app = 'com.unical.digitalsignature.signer';

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


$(document).ready(function () {
    // $('#pades-btn').on('click', run);

    $('.signature-type-btns').on('click', selectSignatureType);

    $('#use-visible-signature-checkbox').change(function () {
        if ($(this).is(":checked")) {
            // console.log("changed");
            signature_data.visible = true;
        } else
            signature_data.visible = false;
    });

    $("#confirm-btn-1").on('click', function () {
        if (signature_data.type == "cades" || (signature_data.type == "pades" && signature_data.visible == false)) 
            nextStep('step-2-cades');
        if (signature_data.type == "pades" && signature_data.visible == true) {
            //TODO 
        }

    });

    $("#confirm-btn-2-cades").on('click',function(){
        console.log("RUN");
        //TODO
    })

    function run() {
        //1) get tab url
        console.log("GET TAB URL...")
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function (tab) {
            pdfURL = tab[0].url;
            console.log(pdfURL);
            downloadPDF(pdfURL)
        });

        //setup connection with native app
        var port = chrome.runtime.connectNative(app);
        console.log(port);
        port.onMessage.addListener(function (msg) {
            var msgJSON = JSON.stringify(msg);
            console.log(msg);

            if (msg.hasOwnProperty('local_path_newFile')) {
                //open signed pdf
                path = "file:///" + msg.local_path_newFile;
                chrome.tabs.create({
                    index: 0,
                    url: path,
                    active: false
                }, function () {});

            }

        });
        port.onDisconnect.addListener(function () {
            console.log("Disconnected: " + chrome.runtime.lastError.message);
        });

        //2) download pdf 
        function downloadPDF(pdfUrl) {
            console.log("DOWNLOAD...")
            chrome.downloads.download({
                url: pdfUrl
            }, function (downloadItemID) {
                getLocalPath(downloadItemID);
            });
        }


        //3) get download file local path
        function getLocalPath(downloadItemID) {
            console.log("GET LOCAL PATH...")
            chrome.downloads.search({
                id: downloadItemID,
                state: "complete"
            }, function (item) {
                if (item.length == 0) {
                    console.log("non ha finito ancora, wait");
                    sleep(2000).then(() => { //wait X second
                        getLocalPath(downloadItemID);
                    });
                } else {
                    console.log(item[0].filename);
                    signature_data.filename = item[0].filename;
                    sendExtMessage(signature_data, port);
                }
            })
        }
    }

    // sleep time expects milliseconds
    function sleep(time) {
        return new Promise((resolve) => setTimeout(resolve, time));
    }

    function sendExtMessage(filename, port) {
        console.log("Send message...")
        port.postMessage(signature_data);
    }

});