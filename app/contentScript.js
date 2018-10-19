console.log("injected");

//NOTA: 1 px = 0.75 point; 1 point = 1.333333 px
chrome.storage.local.get(['fieldsData'], function (result) {

    res = result.fieldsData;
    console.log(res);
    var fields = result.fieldsData.fields;
    console.log(fields);

    const body = document.body;
    const embed = document.getElementsByTagName("embed")[0];
    if(!embed)
        console.log("not found any embed");
    

    const ph = fields[0]["page-height"];
    const pw = fields[0]["page-width"];
    const pageCount = res.page;

    //body size in pt
    body.style.width = pw+20 + "pt";
    body.style.height = ph*pageCount + "pt";
    body.style.overflow = ""

    //embed size in px
    embed.width = topixel(pw)+30;
    embed.height = topixel(ph*pageCount)+120;

    fields.forEach(el => {
        let node = document.createElement("p");
        let text = document.createTextNode(el.name);
        node.appendChild(text);
        node.style.position = "absolute";
        node.style.textTransform = "uppercase";
        let x = el["lower-left-x"] + topoint(25);
        let ely = el["lower-left-y"];
            //pos in page + go to page + other margin (toolbar and space between page)
        y = (ph - ely) + ((el["page"]-1)*ph);
        console.log("("+ph +" - "+ely +") * "+el['page']+" = "+ y);
        node.style.top = y + "pt";
        node.style.left = x + "pt";
        body.prepend(node);
    });

});

function topixel(pt) {
    return pt * 1.333333;
}


function topoint(px) {
    return px * 0.75;
}

chrome.storage.local.remove(['fieldsData']);