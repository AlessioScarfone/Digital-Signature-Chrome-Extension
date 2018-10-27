console.log("Start Injected Content Script");

// store start size of embed and body element
const embedSize = {
    startWidth: 0,
    startHeight: 0,
    roundingWidth: 30,
    roundingHeight: 120
    // roundingHeight: 0
}

const bodySize = {
    startWidth: 0,
    startHeight: 0,
    roundingWidth: 30,
    roundingHeight: 0
}

const fieldNameRounding = { //px
    x: 25,
    isMixOrientation: false,
    x_orientationMix: 0,
    start_x_orientationMix: 0,
    y: 0,

    /**
     * Check if the document contains both horizontal and vertical pages
     * @param {*} pages - list of pages 
     */
    checkIfMixOrientation: function (pages) {
        if (pages.length == 1) return false;

        let vertical = false;
        let horizontal = false;
        for (let index = 0; index < pages.length; index++) {
            if (pages[index]["page-height"] > pages[index]["page-width"])
                vertical = true;
            else if (pages[index]["page-height"] < pages[index]["page-width"])
                horizontal = true;
            if (vertical && horizontal) {
                this.isMixOrientation = true;
                return;
            }
        }

    },

    /**
     * Calculate the adjustment for field position in vertical page. It is used if the pdf contain both horizontal and vertical pages
     * @param {*} pages - list of pages
     */
    calculateMixOrientationAdjustment: function (pages) {
        let vpage = getAVerticalPage(pages);
        let hpage = getAnHorizontalPage(pages);
        console.log(vpage);
        console.log(hpage);
        if (vpage != null && hpage != null) {
            this.x_orientationMix = ((hpage["page-width"] - vpage["page-width"]) / 2).toFixed(2);
            this.start_x_orientationMix = this.x_orientationMix;
        }
    },

    /**
     * Update the adjustment value according to zoom
     * @param {number} zoomval - value of the zoom
     */
    updateMixOrientationAdjustment: function (zoomval) {
        this.x_orientationMix = addPercentage(this.x_orientationMix, zoomval, this.start_x_orientationMix);
    }
}

const spaceBetweenPage = 10; //px
const pdfToolbarSpace = 20; //px

var singatureNameNode = []; //store initial field setting [name , startX , startY]

chrome.storage.local.get(['pdfInfo'], function (result) {

    const data = result.pdfInfo;
    console.log(data);
    //NOTA: the page of the "field" (fields[i].page) begins the count from 1
    const fields = data.fields;
    const pages = data.pages;
    // console.log(fields);
    // console.log(pages);
    // console.log(pageCount);

    const body = document.body;
    const embed = document.getElementsByTagName("embed")[0];
    if (!embed)
        console.log("not found any embed");

    // const ph = fields[0]["page-height"];
    // const ph = getMaxHeight(pages);
    // const pw = fields[0]["page-width"];
    const pw = getMaxWidth(pages);

    //body size in pt
    body.style.width = pw + bodySize.roundingWidth + "pt";
    body.style.height = getTotalHeightOfPDF(pages, topoint(spaceBetweenPage), topoint(pdfToolbarSpace)) + bodySize.roundingHeight + "pt";
    bodySize.startWidth = parseFloat(body.style.width) - bodySize.roundingWidth;
    bodySize.startHeight = parseFloat(body.style.height) - bodySize.roundingHeight;
    body.style.overflow = ""

    //embed size in px
    embed.width = topixel(pw) + embedSize.roundingWidth;
    // embed.height = topixel(ph * pageCount) + embedSize.roundingHeight;
    embed.height = topixel(getTotalHeightOfPDF(pages, spaceBetweenPage + 10, pdfToolbarSpace));

    embedSize.startWidth = embed.width - embedSize.roundingWidth;
    embedSize.startHeight = embed.height - embedSize.roundingHeight;

    fieldNameRounding.checkIfMixOrientation(pages);
    if (fieldNameRounding.isMixOrientation) {
        fieldNameRounding.calculateMixOrientationAdjustment(pages);
    }

    console.log(fieldNameRounding);

    fields.forEach(el => {
        let node = document.createElement("p");
        let text = document.createTextNode(el.name);
        node.appendChild(text);
        node.style.position = "absolute";
        node.style.textTransform = "uppercase";

        let currentPageHeight = pages[el["page"] - 1]["page-height"];

        //X coordinate of the field
        let x = el["lower-left-x"] + topoint(fieldNameRounding.x);
        //add adjustment if the pdf contains both horizontal and vertical pages
        if (isVertical(pages, el["page"] - 1) && fieldNameRounding.isMixOrientation)
            x = parseFloat(x) + parseFloat(fieldNameRounding.x_orientationMix);

        //Y coordinate of the field
        let element_y = el["lower-left-y"];
        //pos in page + go to page + adjustments
        y = (currentPageHeight - element_y) + calculateHeightFromStartToPage(pages, el["page"] - 1, topoint(spaceBetweenPage), topoint(pdfToolbarSpace)) + topoint(fieldNameRounding.y);
        // console.log("(" + currentPageHeight + " - " + element_y + ") +" + calculateHeightFromStartToPage(pages, el["page"] - 1, topoint(spaceBetweenPage), topoint(pdfToolbarSpace)) + " +" + topoint(fieldNameRounding.y));

        node.style.top = y + "pt";
        node.style.left = x + "pt";

        //text style
        node.style.fontSize = "15px";
        node.style.fontWeight = "bold";

        node.classList.add("field-name");

        body.prepend(node);

        singatureNameNode.push({
            name: el.name,
            startX: x,
            startY: y,
            "page-height": pages[el["page"] - 1]["page-height"],
            "page-width": pages[el["page"] - 1]["page-width"],
        });
    });


});

chrome.runtime.onConnect.addListener(function (port) {
    if (port.name == "content-script") {
        //listener for ZOOM event
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
            // const currentEmbedHeight = parseFloat(embed.height);
            // embed.height = addPercentage(currentEmbedHeight, zoomval, embedSize.startHeight, embedSize.roundingHeight);
            embed.height = topixel(parseFloat(document.body.style.height)) + embedSize.roundingHeight;

            //adapt fields name position to zoom

            let mixOrientationBeforeZoom = 0;
            if (fieldNameRounding.isMixOrientation) {
                mixOrientationBeforeZoom = fieldNameRounding.x_orientationMix;
                fieldNameRounding.updateMixOrientationAdjustment(zoomval);
            }

            _fields.forEach(el => {
                const originalField = singatureNameNode.find(field => field.name == el.textContent);
                const top = parseFloat(el.style.top);
                const left = parseFloat(el.style.left);

                //mix orientation and vertical page
                if (fieldNameRounding.isMixOrientation && originalField["page-height"] > originalField["page-width"]) {
                    el.style.left = addPercentage(left - mixOrientationBeforeZoom,
                        originalField.startX - fieldNameRounding.start_x_orientationMix, zoomval, fieldNameRounding.x) + fieldNameRounding.x_orientationMix + "pt";
                    const top = parseFloat(el.style.top);
                    el.style.top = addPercentage(top, originalField.startY, zoomval, fieldNameRounding.y) + "pt";
                }

                el.style.top = addPercentage(top, originalField.startY, zoomval, fieldNameRounding.y) + "pt";
                el.style.left = addPercentage(left, originalField.startX - topoint(fieldNameRounding.x), zoomval, fieldNameRounding.x) + "pt";
            });

        });
    }
});


/**
 * Calculate the value after apply an increasing/decreasing in percentage
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

/**
 * Check if a page is vertical 
 * @param {*} pages - list of pages
 * @param {number} pageindex - index of page in pages list
 */
function isVertical(pages, pageIndex) {
    if (pages[pageIndex]["page-height"] > pages[pageIndex]["page-width"])
        return true;
    return false;
}

/**
 * return the first vertical page in the document
 * @param {*} pages - list of pages
 */
function getAVerticalPage(pages) {
    for (let index = 0; index < pages.length; index++) {
        if (pages[index]["page-height"] > pages[index]["page-width"])
            return pages[index];
    }
    return null;
}
/**
 * return the first horizontal page in the document
 * @param {*} pages - list of pages
 */
function getAnHorizontalPage(pages) {
    for (let index = 0; index < pages.length; index++) {
        if (pages[index]["page-height"] < pages[index]["page-width"])
            return pages[index];
    }
    return null;
}

/** Return the maximum width of pages in pt.
 * @param {*} pages - list of pages 
 */
function getMaxWidth(pages) {
    let max = 0;
    pages.forEach(p => {
        const w = p["page-width"];
        if (w > max)
            max = w;
    });
    return max;
}


/** Return the maximum height of pages in pt.
 * @param {*} pages - list of pages 
 */
function getMaxHeight(pages) {
    let max = 0;
    pages.forEach(p => {
        const w = p["page-height"];
        if (w > max)
            max = w;
    });
    return max;
}

/**
 * Calculate  the total height of the pdf in pt
 * @param {*} pages  - list of pages 
 * @param {number} spaceBetweenPages - space between pages in browser viewer
 * @param {number} headerSpace - space for the header of the browser viewer 
 */
function getTotalHeightOfPDF(pages, spaceBetweenPages = 0, headerSpace = 0) {
    let total = 0;
    pages.forEach(p => {
        total += p["page-height"];
    });
    return total + (spaceBetweenPages * pages.length) + headerSpace;
}

/**
 * Calculate the distance between start of document and selected page. Note: page is counted from 0
 * @param {*} pages - list of pages 
 * @param {number} pageindex - page to reach
 * @param {number} spaceBetweenPages - space between pages in browser viewer
 * @param {number} headerSpace - space for the header of the browser viewer 
 */
function calculateHeightFromStartToPage(pages, pageindex, spaceBetweenPages = 0, headerSpace = 0) {
    if (pageindex >= pages.left || pageindex < 0)
        return -1;
    let total = 0;
    for (let i = 0; i < pageindex; i++) {
        total += pages[i]["page-height"];
    }
    return total + (spaceBetweenPages * pageindex) + headerSpace;

}



//NOTA: 1 px = 0.75 point; 1 point = 1.333333 px

/**
 * Convert point(pt) in pixel(px)
 * @param {number} pt - value in point to convert in pixel
 */
function topixel(pt) {
    return pt * 1.333333;
}

/**
 * convert pixel(px) in point (pt)
 * @param {number} px - value in pixel to convert in point
 */
function topoint(px) {
    return px * 0.75;
}

chrome.storage.local.remove(['fieldsData']);