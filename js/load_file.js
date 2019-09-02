String.prototype.format = function() {
    return [...arguments].reduce((p,c) => p.replace(/%s/,c), this);
  };

function readSingleFile(e) {
    var file = e.target.files[0];
    if (!file) {
      return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
      var contents = e.target.result;
      // Display file content
      drawUI(contents);
    };
    reader.readAsText(file);
  }

function drawUI(contents) {
    // Load the XML document
    parser = new DOMParser();
    xmlDoc = parser.parseFromString(contents,"text/xml");
    // Get the main template
    var template = xmlDoc.getElementsByTagName("Data")[0];
    // clear the canvas
    var canvas = document.getElementById("drawingCanvas");
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Load the main template
    readNGuiLayerData(template);
}

function printInfo(content) {
    // Get the current 
    var element = document.getElementById('file-content');
    element.innerHTML += content;
}

function childElements(element) {
    // return an array of child elements (need this because js gives the Text
    // children too...)
    var children = element.childNodes;
    var sub_elems = [];
    for (var child of children)
    {
        try {
            // check to see if it has an attribute
            // I'm sure there is a better way to do this...
            child.getAttribute("name");
            sub_elems.push(child);
        }
        catch (error) { /* do nothing */ }
    }
    return sub_elems;
}

function readNGuiLayerData(element, parentElementData = null) {
    // Reads an NGuiLayerData struct
    var children = childElements(element);
    var style = elementByName(children, "Style");
    var style_dict = new Object();
    readNGuiGraphicStyle(style, style_dict);
    var elementData = readNGuiElementData(elementByName(children, "ElementData"),
                                      style_dict, parentElementData);
    console.log("HI there!");
    console.log(elementData);
    var children_nodes = childElements(elementByName(children, "Children"));
    for (var child of children_nodes) {
        if (child.getAttribute("value") == "GcNGuiLayerData.xml") {
            readNGuiLayerData(child, elementData);
        } else if (child.getAttribute("value") == "GcNGuiGraphicData.xml") {
            readNGuiGraphicData(child, elementData);
        } else if (child.getAttribute("value") == "GcNGuiTextData.xml") {
            readNGuiTextData(child, elementData);
        }
    }
}

// children functions

function readNGuiGraphicData(element, parentElementData) {
    // Reads an NGUILayerData struct
    var children = childElements(element);
    var style_dict = new Object();
    readNGuiGraphicStyle(elementByName(children, "Style"), style_dict)
    elementData = readNGuiElementData(elementByName(children, "ElementData"),
                                      style_dict, parentElementData);
}

function readNGuiTextData(element, parentElementData) {
    var children = childElements(element);
    var text = elementByName(children, "Text").getAttribute("value");
    var style_dict = new Object();
    readNGuiGraphicStyle(elementByName(children, "GraphicStyle"), style_dict)
    var text_style_dict = Object();
    readNGuiTextStyle(elementByName(children, "Style"), text_style_dict)
    var elementData = readNGuiElementData(elementByName(children, "Data"),
                                          style_dict, parentElementData);
    // draw the text
    var defaultStyle = text_style_dict["Default"];
    var canvas = document.getElementById("drawingCanvas");
    var ctx = canvas.getContext("2d");
    ctx.font = "%spx Ariel".format(defaultStyle["FontHeight"]);
    ctx.fillStyle = defaultStyle["Colour"];
    ctx.fillText(text, elementData[0], elementData[1])
}

// other stuff

function readNGuiElementData(element, style, parentElementData) {
    var children = childElements(element);
    var ID = elementByName(children, "ID").getAttribute("value");
    console.log("drawing" + ID);
    // Return the layout data as the sizes are needed for child templates to
    // determine their actual position/size.
    return readNGuiLayoutData(elementByName(children, "Layout"), style,
                              parentElementData);
}

function readNGuiLayoutData(element, style, parentElementData) {
    var children = childElements(element);
    var PositionX = parseInt(elementByName(children, "PositionX").getAttribute("value"))
    var PositionY = parseInt(elementByName(children, "PositionY").getAttribute("value"))
    var Width = parseInt(elementByName(children, "Width").getAttribute("value"))
    var WidthPercentage = elementByName(children, "WidthPercentage").getAttribute("value")
    var Height = parseInt(elementByName(children, "Height").getAttribute("value"))
    var HeightPercentage = elementByName(children, "HeightPercentage").getAttribute("value")

    console.log(parentElementData);

    // determine the proportions of the parent element data.
    // If there is no parent then the parentElementData will be null.
    // Otherwise it will be a list of 4 values equivalent to that returned by
    // this function.
    if (parentElementData) {
        parentOffsetX = parentElementData[0];
        parentOffsetY = parentElementData[1];
        parentWidth = parentElementData[2];
        parentHeight = parentElementData[3];
    } else {
        var canvas = document.getElementById("drawingCanvas");
        parentOffsetX = 0;
        parentOffsetY = 0;
        parentWidth = canvas.width;
        parentHeight = canvas.height;
    }

    // make the offsets relative to the parent
    PositionX = parentOffsetX + PositionX;
    PositionY = parentOffsetY + PositionY;

    // Check to see if the width/height are relative
    if (WidthPercentage == "True") {
        Width = parentWidth * (Width / 100)
    }
    if (HeightPercentage == "True") {
        Height = parentHeight * (Height / 100)
    }
    drawRectangle(PositionX, PositionY, Width, Height, style);
    console.log([PositionX, PositionY, Width, Height])
    return [PositionX, PositionY, Width, Height];
}

// style reading functions

function readNGuiTextStyle(element, style_dict) {
    // Main entry point for loading text style data into the style dict.
    var children = childElements(element);
    // create style objects for each situation
    var defaultStyle = new Object();
    var highlightStyle = new Object();
    var activeStyle = new Object();
    // populate the dictionaries
    readNGuiTextStyleData(elementByName(children, "Default"), defaultStyle);
    readNGuiTextStyleData(elementByName(children, "Highlight"), highlightStyle);
    readNGuiTextStyleData(elementByName(children, "Default"), activeStyle);
    // combine them all
    style_dict['Default'] = defaultStyle;
    style_dict['Highlight'] = highlightStyle;
    style_dict['Active'] = activeStyle;
}

function readNGuiTextStyleData(element, style_dict) {
    var children = childElements(element);
    style_dict['Colour'] = readColour(elementByName(children, "Colour"));
    style_dict['FontHeight'] = parseInt(elementByName(children, "FontHeight"));
}

function readNGuiGraphicStyle(element, style_dict) {
    // Main entry point for loading graphic style data into the style dict.
    var children = childElements(element);
    // create style objects for each situation
    var defaultStyle = new Object();
    var highlightStyle = new Object();
    var activeStyle = new Object();
    // populate the dictionaries
    readNGuiGraphicStyleData(elementByName(children, "Default"), defaultStyle);
    readNGuiGraphicStyleData(elementByName(children, "Highlight"), highlightStyle);
    readNGuiGraphicStyleData(elementByName(children, "Default"), activeStyle);
    // combine them all
    style_dict['Default'] = defaultStyle;
    style_dict['Highlight'] = highlightStyle;
    style_dict['Active'] = activeStyle;
}

function readNGuiGraphicStyleData(element, style_dict) {
    var children = childElements(element);
    style_dict['Colour'] = readColour(elementByName(children, "Colour"));
    style_dict['StrokeColour'] = readColour(elementByName(children, "StrokeColour"));
}

function readColour(element) {
    // Read and return a colour struct
    var children = childElements(element);
    return [elementByName(children, "R").getAttribute("value"),
            elementByName(children, "G").getAttribute("value"),
            elementByName(children, "B").getAttribute("value"),
            elementByName(children, "A").getAttribute("value")]
}

function colourToRGBA(colour) {
    return "rgba(%s, %s, %s, %s)".format(colour[0], colour[1],
                                         colour[2], colour[3])
}


function elementByName(elements, name) {
    for (var child of elements) {
        if (child.getAttribute("name") == name) {
            return child
        }
    }
    return null;
}

function getData(element, reqName) {
    var name = element.getAttribute("name");
    var value = element.getAttribute("value");
    if (name == reqName) {
        return value;
    }
    return null;
}

function drawRectangle(x, y, width, height, style) {
    var c = document.getElementById("drawingCanvas");
    var ctx = c.getContext("2d");
    ctx.beginPath();
    var defaultStyle = style['Default']
    ctx.fillStyle = colourToRGBA(defaultStyle['Colour']);
    ctx.strokeStyle = colourToRGBA(defaultStyle['StrokeColour']);
    ctx.rect(x, y, width, height);
    //ctx.fillRect(x, y, width, height);
    ctx.stroke();
}


// add the file selector thing
document.getElementById('file-input').addEventListener('change', readSingleFile, false);