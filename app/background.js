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

const app = 'com.unical.digitalsignature.signer';

//possible value of appCurrentState: signing, ready
var appCurrentState = "ready";
var port = null;

function openConnection() {
  port = chrome.runtime.connectNative(app);

  console.log(port);

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
      appCurrentState = "ready";
      chrome.runtime.sendMessage({
        state: "end",
      }, function (response) {});

    }
    if (msg.hasOwnProperty("native_app_message") && msg.native_app_message == "info") {
      //forward fields list to popup
      chrome.runtime.sendMessage({
        state: 'info',
        page: msg.page,
        fields: msg.fields
      }, function (response) {});
    }
  });

  port.onDisconnect.addListener(function () {
    console.log("Disconnected: " + chrome.runtime.lastError.message);
  });

  return port;
}

function closeConnection() {
  port.disconnect();
}

function downloadFile(pdfURL, data, callback) {
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
        if (callback)
          callback(data)
      }
    });
  }

  // sleep time expects milliseconds
  function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }
}

function sendDataForSign(data) {
  appCurrentState = "signing";
  console.log("Send message to native app...")
  console.log(data);
  data.action = "sign";
  port.postMessage(data);
};

function requestPDFInfo(data) {
  console.log("Send message to native app...")
  console.log(data);

  //update signature data of popup
  chrome.runtime.sendMessage({
    state: popupMessageType.update,
    data: data
  }, function (response) {});

  data.action = popupMessageType.info;
  port.postMessage(data);

};


var popupMessageType = {
  init: 'init',
  disconnect: 'disconnect',
  download_and_sign: 'download_and_sign',
  sign: 'sign',
  download_and_getInfo: 'donwload_and_getInfo',
  info: 'info',
}

//listener message Popup -> Background
chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    console.log(request);
    switch (request.action) {
      case popupMessageType.init:
        openConnection();
        break;
      case popupMessageType.disconnect:
        closeConnection();
        break;

      case popupMessageType.download_and_sign:
        downloadFile(request.url, request.data, sendDataForSign);
        break;
      case popupMessageType.sign: //used for directly sign a local file
        sendDataForSign(request.data);
        break;

      case popupMessageType.download_and_getInfo: //used for directly sign a local file
        downloadFile(request.url, request.data, requestPDFInfo);
        break;
      case popupMessageType.info: //used for local file
        requestPDFInfo(request.data)
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