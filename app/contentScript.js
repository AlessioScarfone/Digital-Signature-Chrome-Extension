console.log("Start Injected Content Script");

// store start size of embed and body element
const embedSize = {
    startWidth: 0,
    startHeight: 0,
    roundingWidth: 30,
    roundingHeight: 120
}

const bodySize = {
    startWidth: 0,
    startHeight: 0,
    roundingWidth: 20,
    roundingHeight: 0
}

const fieldNameRounding = {
    x: 25,
    y: 0
}

var singatureNameNode = []; //store initial field setting [name , startX , startY]

chrome.runtime.onConnect.addListener(function (port) {
    if (port.name == "content-script") {
        port.onMessage.addListener(function (msg) {
            console.log(msg);
            const zoomval = ((msg.newZoom - msg.oldZoom) * 100).toFixed(2);
            const _fields = Array.from(document.getElementsByClassName("field-name"));
            // console.log(_fields);

            console.log("zoomval:" + zoomval);

            //adapt body size to zoom
            const currentBodyWidth = parseFloat(document.body.style.width);
            const currentBodyHeight = parseFloat(document.body.style.height);
            document.body.style.width = addPercentage(currentBodyWidth, zoomval, bodySize.startWidth) + "pt";
            document.body.style.height = addPercentage(currentBodyHeight, zoomval, bodySize.startHeight) + "pt";

            //adapt embed size to zoom (px not needed)
            const embed = document.getElementsByTagName("embed")[0];
            const currentEmbedWidth = parseFloat(embed.width);
            embed.width = addPercentage(currentEmbedWidth, zoomval, embedSize.startWidth, embedSize.roundingWidth);
            const currentEmbedHeight = parseFloat(embed.height);
            embed.height = addPercentage(currentEmbedHeight, zoomval, embedSize.startHeight, embedSize.roundingHeight);

            //adapt fields name position to zoom
            // console.log(singatureNameNode);
            _fields.forEach(el => {
                const f = singatureNameNode.find(field => field.name == el.textContent);
                const top = parseFloat(el.style.top);
                const left = parseFloat(el.style.left);
                el.style.top = addPercentage(top, f.startY, zoomval, fieldNameRounding.y) + "pt";
                el.style.left = addPercentage(left, f.startX, zoomval, fieldNameRounding.x) + "pt";
            });
        });
    }
});

/**
 * 
 * @param {number} value - value on which sum the calculated percentage
 * @param {number} percentage - percentage to calculate
 * @param {number} start [start=value] - value on which to calculate the percentage
 * @param {number} roundvalue [roundvalue=0] - value out of percentage
 */
function addPercentage(value, percentage, start = value, roundvalue = 0) {
    value = value - roundvalue;
    value = value + ((start / 100) * percentage);
    return value + roundvalue;
}

chrome.storage.local.get(['fieldsData'], function (result) {

    var fieldData = result.fieldsData;
    console.log(fieldData);
    var fields = fieldData.fields;
    // console.log(fields);

    const body = document.body;
    const embed = document.getElementsByTagName("embed")[0];
    if (!embed)
        console.log("not found any embed");

    const ph = fields[0]["page-height"];
    const pw = fields[0]["page-width"];
    const pageCount = fieldData.page;

    //body size in pt
    body.style.width = pw + bodySize.roundingWidth + "pt";
    body.style.height = (ph * pageCount) + bodySize.roundingHeight + "pt";
    bodySize.startWidth = parseFloat(body.style.width) - bodySize.roundingWidth;
    bodySize.startHeight = parseFloat(body.style.height) - bodySize.roundingHeight;
    body.style.overflow = ""

    //embed size in px
    embed.width = topixel(pw) + embedSize.roundingWidth;
    embed.height = topixel(ph * pageCount) + embedSize.roundingHeight;

    embedSize.startWidth = embed.width - embedSize.roundingWidth;
    embedSize.startHeight = embed.height - embedSize.roundingHeight;

    fields.forEach(el => {
        let node = document.createElement("p");
        let text = document.createTextNode(el.name);
        node.appendChild(text);
        node.style.position = "absolute";
        node.style.textTransform = "uppercase";
        let x = el["lower-left-x"] + topoint(fieldNameRounding.x);
        let ely = el["lower-left-y"];
        //pos in page + go to page + adjustments
        y = (ph - ely) + ((el["page"] - 1) * ph) + topoint(fieldNameRounding.y);
        // console.log("(" + ph + " - " + ely + ") * " + el['page'] + " = " + y);
        node.style.top = y + "pt";
        node.style.left = x + "pt";
        node.style.fontSize = "15px";
        node.style.fontWeight = "bold";

        node.classList.add("field-name");
        body.prepend(node);

        singatureNameNode.push({
            name: el.name,
            startX: el["lower-left-x"],
            startY: y
        });
    });

});


//NOTA: 1 px = 0.75 point; 1 point = 1.333333 px

/**
 * 
 * @param {number} pt - convert point(pt) in pixel(px)
 */
function topixel(pt) {
    return pt * 1.333333;
}

/**
 * 
 * @param {number} px - convert pixel(px) in point (pt)
 */
function topoint(px) {
    return px * 0.75;
}

chrome.storage.local.remove(['fieldsData']);