console.log("injected");
var fields = "";
chrome.storage.local.get(['fieldsData'], function (result) {
    fields = result.fieldsData.fields;
    console.log(fields);

    const body = document.body;


    fields.forEach(el => {
        let node = document.createElement("h2");
        let text = document.createTextNode(el.name);
        node.appendChild(text);
        node.style.position = "absolute";
        node.style.top = "0";
        node.style.right = el["lower-left-x"] + "px";
        body.appendChild(node);
    });





    // const canvas = document.createElement("canvas");
    // body.appendChild(canvas);

    // canvas.width = window.innerWidth;
    // canvas.height = window.innerHeight;

    // const ctx = canvas.getContext('2d');
    // ctx.font = "25px Arial";


    // fields.forEach(el => {
    //     ctx.fillText(el.name, el["lower - left - x"], el["lower - left - y"]);

    // });

});

chrome.storage.local.remove(['fieldsData']);