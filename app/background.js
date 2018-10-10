console.log("Start background");

chrome.runtime.onInstalled.addListener(function () {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: {
          urlSuffix: '.pdf'
        },
      })],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
});


var app = 'com.unical.digitalsignature.signer';

var response_local_path = 'local_path_newFile';
var response_signature_type = "signature_type";


class BackgroundCommandHandler {

  constructor() {
    this._ports = [];
  }

  get ports() {
    return this._ports;
  }

  openConnection(portName) {
    var port = chrome.runtime.connectNative(app);
    port.name = portName;
    this._ports.push(port);

    console.log(port);

    port.onMessage.addListener(function (msg) {
      console.log("RECEIVED FROM NATIVE APP:");
      console.log(msg);
      if (msg.hasOwnProperty(response_signature_type) && msg.response_signature_type == "pades" && msg.hasOwnProperty(response_local_path)) {
        //open signed pdf -> if the file isn't a pdf not open
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


    return port;
  }

  closeConnection(portName) {
    port = this.findPort(portName);
    port.disconnect()
  }

  findPort(portName) {
    for (let i = 0; i < this._ports.length; i++) {
      const element = this._ports[i];
      if (element.name == portName)
        return element;
    }
    return undefined;
  }


  downloadFileAndSign(portName, pdfURL, data) {
    var port = this.findPort(portName);
    //1) get tab url
    downloadPDF(pdfURL)

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
          console.log("Downloading....");
          sleep(1500).then(() => { //wait X second
            getLocalPath(downloadItemID);
          });
        } else {
          console.log(item[0].filename);
          data.filename = item[0].filename;
          console.log("Send message to native app...")
          console.log(data);
          port.postMessage(data);
        }
      })
    }
    // sleep time expects milliseconds
    function sleep(time) {
      return new Promise((resolve) => setTimeout(resolve, time));
    }
  }

}
//  ---- end BackgroundCommandHandler Declaration ---

var bch = new BackgroundCommandHandler();
chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    console.log(request);
    switch (request.action) {
      case 'init':
        bch.openConnection(request.port);
        break;
      case 'disconnect':
        bch.closeConnection(request.port);
        break;
      case 'download':
        bch.downloadFileAndSign(request.port, request.url, request.data);
        break;

      default:
        console.log("Invalid action");
        break;
    }

    sendResponse({
      ack: "success",
      received: request.action,
    });
  });