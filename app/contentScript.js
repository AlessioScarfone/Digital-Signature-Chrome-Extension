console.log("injected");
var fields = "";
chrome.storage.local.get(['fieldsData'], function (result) {
    res = result.fieldsData;
    console.log(res);
    fields = result.fieldsData.fields;
    console.log(fields);

    const body = document.body;

    const ph = fields[0]["page-height"];
    const pw = fields[0]["page-width"];
    const pageCount = res.page;


    body.style.width = pw + "pt";
    body.style.height = ph + "pt";

    // fields.forEach(el => {
    //     let node = document.createElement("h2");
    //     let text = document.createTextNode(el.name);
    //     node.appendChild(text);
    //     node.style.position = "absolute";
    //     node.style.top = "0";
    //     node.style.left = el["lower-left-x"] + "pt";
    //     body.appendChild(node);
    // });

    const canvas = document.createElement("canvas");
    body.appendChild(canvas);

    canvas.width = pw;
    canvas.height = ph * pageCount;

    const ctx = canvas.getContext('2d');
    ctx.font = "12px Arial";


    fields.forEach(el => {
        ctx.fillText(el.name, el["lower - left - x"], el["lower - left - y"]);

    });

});

chrome.storage.local.remove(['fieldsData']);