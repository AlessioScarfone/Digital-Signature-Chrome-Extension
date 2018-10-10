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
    var obj = this;

    port.onMessage.addListener(function (msg) {
      console.log("RECEIVED FROM NATIVE APP:");
      console.log(msg);

      //open signed pdf if is signed with pades format
      if (msg.hasOwnProperty("native_app_message") && msg.native_app_message == "end" && msg.signature_type == "pades") {
        //open signed pdf -> if the file isn't a pdf not open
        var path = "file:///" + msg.local_path_newFile;
        chrome.tabs.create({
          index: 0,
          url: path,
          active: false
        }, function () {});
      }
      if (msg.hasOwnProperty("native_app_message") && msg.native_app_message == "end") {

        chrome.runtime.sendMessage({
          state: "end",
        }, function (response) {});

      }
    });

    port.onDisconnect.addListener(function () {
      console.log("Disconnected: " + chrome.runtime.lastError.message);
      removePortFromList(obj, port.name);
    });


    return port;
  }

  closeConnection(portName) {
    port = this.findPort(portName);
    port.disconnect()
    this.removePort(port.name);
  }

  removePort(portName) {
    var toDelete = null;
    for (let i = 0; i < this._ports.length; i++) {
      const element = this._ports[i];
      if (element !== undefined && element.name == portName)
        toDelete = i;
      break;
    }
    console.log("REMOVE PORT at pos:" + toDelete);
    if (toDelete !== null)
      delete this._ports[toDelete];
  }

  findPort(portName) {
    for (let i = 0; i < this._ports.length; i++) {
      const element = this._ports[i];
      if (element !== undefined && element.name == portName)
        return element;
    }
    return undefined;
  }

  downloadFileAndSign(portName, pdfURL, data) {
    //1) get tab url
    downloadPDF(pdfURL)

    //2) download pdf 
    function downloadPDF(pdfUrl) {
      console.log("Start download document...")
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
          signFile(portName, data);
        }
      });

    }

    // sleep time expects milliseconds
    function sleep(time) {
      return new Promise((resolve) => setTimeout(resolve, time));
    }
  }

  sendDataForSign(portName, data) {
    var port = this.findPort(portName);
    console.log("Send message to native app...")
    console.log(data);
    port.postMessage(data);
  };

} //close class 

function removePortFromList(bch, portName) {
  bch.removePort(portName);
}


//  ---- end BackgroundCommandHandler Declaration ---


var bch = new BackgroundCommandHandler();

//listener message Popup -> Background
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
      case 'download_and_sign':
        bch.downloadFileAndSign(request.port, request.url, request.data);
        break;
      case 'sign': //used for directly sign a local file
        bch.sendDataForSign(request.port, request.data);
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