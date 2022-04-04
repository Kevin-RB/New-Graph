const w = 930;
const h = 930;
const padding = 60;
const svg = d3.select("svg")

//set line length
let r1 = 120
let r2 = 400

//intercerption radius
let interceptionSpace = ((r2 - r1) / 2)
let intercept1 = r1
let intercept2 = r1 + interceptionSpace
let intercept3 = r1 + 2 * interceptionSpace
let intercept4 = intercept3 + 50

//helper radius function
const helperRadiusFunction = {
    0: intercept3,
    1: intercept2,
    2: intercept1,
    label: intercept4
}

//division space for the graph
let divisionSpace
//type of dataset
let datasetType

//current file name
let currentFileName


//sets the type of dataset
const setDatasetType = (numberOfVariables) => {
    const datasetTypes = {
        77: 'M1',
        78: 'M2',
        55: 'M3',
        71: 'M4',
        63: 'M5',
        79: 'M6'
    }
    return datasetTypes[numberOfVariables]
}

//sets the title of the graph
const setGraphTitle = (currentType) => {
    const titles = {
        'M1': 'Lavar Ropa',
        'M2': 'Bañarse',
        'M3': 'Usar el inodoro',
        'M4': 'Lavarse las manos',
        'M5': 'Cepillarse los dientes',
        'M6': 'Lavar loza',
    }
    return titles[currentType]
}

const generateGraph = (fileName) => {
    cleanCanvas()
    const path = `../cvs/${fileName}`
    d3.csv(path).then(data => {
        console.log(data)

        //count the total number of variables in the dataset
        const variables = data.columns.filter(col => isRealVariable(col))
        console.log(variables)

        //set dataset type acording to the number of variables
        datasetType = setDatasetType(variables.length)
        console.log(datasetType)

        //set an array of real variables and its values
        const realData = data.reduce((prev, curr) => {
            const currData = {}
            for (const key in curr) {
                const currentVariable = isRealVariable(key)
                if (currentVariable) {
                    if (!isNaN(+curr[key])) {
                        currData[key] = +curr[key]
                    }
                }
            }
            const isNotEmpty = Object.keys(currData).length
            if (isNotEmpty) {
                return [...prev, currData]
            } else {
                return [...prev]
            }
        }, [])
        console.log(realData)
        // indexes the array, giving each variable the total number of values on index
        const indexedVariables = realData.reduce((list, element) => {
            for (const key in element) {
                if (!list[key]) {
                    list[key] = []
                }

                if (!list[key][element[key]] && element[key] != 0) {
                    list[key][element[key]] = 1
                } else if (element[key] != 0) {
                    list[key][element[key]]++
                }
            }
            return list
        }, [])
        for (const key in indexedVariables) {
            indexedVariables[key].shift()
        }
        console.log(indexedVariables)

        drawCanvas()
        generateRadialLines(variables)
        generateLabels(variables)
        generateChartTitle()
        generateCircles()
        renderData(indexedVariables)
    })
}

const drawCanvas = () => {
    svg.attr('width', w)
    svg.attr('height', h)
}
const generateChartTitle = () => {
    svg.append('text')
        .attr('class', 'label label_title')
        .text(() => setGraphTitle(datasetType))
        .attr("x", padding / 2)
        .attr("y", padding / 2)
}

const generateRadialLines = (variables, data) => {

    divisionSpace = (360 / variables.length) * (Math.PI / 180)
    let radialLineGenerator = d3.lineRadial();

    //intial angle
    let angle = 0

    svg.select('#radial-lines')
        .selectAll('svg')
        .data(variables)
        .enter()
        .append('g')
        .attr('id', (d) => d)
        .append('path')
        .attr("d", (d) => {
            let radialpoints = [
                [angle, r1],
                [angle, r2],
            ]
            let radialData = radialLineGenerator(radialpoints);
            angle += divisionSpace
            return radialData
        })
        .attr("stroke", "gray")
        .attr('stroke-width', 1)
        .attr('transform', `translate(${w / 2}, ${h / 2})`)
        .append('title')
        .text((d) => d)
    // .on('mouseover', (item) => {
    //     console.log(item.target.__data__)
    // })
}

const generateLabels = (variables) => {
    //intial angle
    let angle = (Math.PI / 180) * 90
    for (let item of variables) {
        svg.select(`#${item}`)
            .append("text")
            .attr('class', 'label')
            .attr("x", () => {
                const xCenter = w / 2
                const xPos = xCenter + helperRadiusFunction.label * Math.cos(angle) - 15 / 2
                return xPos
            })
            .attr("y", () => {
                const yCenter = w / 2
                const yPos = yCenter - helperRadiusFunction.label * Math.sin(angle) + 10 / 2
                return yPos
            })
            .text(() => {
                const label = item.slice(3)
                return label
            });
        angle -= divisionSpace
    }
}

const renderData = (chartData) => {
    const keys = Object.keys(chartData)
    //min-max values for normalization 
    const [minVal, maxVal] = getMinMax(chartData)
    console.log(minVal, maxVal)
    //intial angle
    let angle = (Math.PI / 180) * 90
    //circle count
    let circleCount = 1

    for (let variable in keys) {
        // console.log(keys[variable])
        const data = chartData[keys[variable]]
        // console.log(data)
        svg.select(`#${keys[variable]}`)
            .selectAll('circle')
            .data(data)
            .enter()
            .append('circle')
            .attr('cx', (d, i) => {
                const xCenter = w / 2
                const xPos = xCenter + helperRadiusFunction[i] * Math.cos(angle)
                return xPos
            })
            .attr('cy', (d, i) => {
                const yCenter = h / 2
                const yPos = yCenter - helperRadiusFunction[i] * Math.sin(angle)
                return yPos
            })
            .attr('r', (d) => {
                if (d != undefined) {
                    // console.log(d)
                    return normalize(d, minVal, maxVal)
                }
            })
            .attr('data', (d) => d)
            // .attr("fill", `pink`)
            // .attr('stroke', 'black')
            .attr('class', 'circle')
            .attr("fill", () => {
                return getCircleColor(circleCount)
            })
            .on("mouseenter", (d) => {
                // console.log(d)
                const data = d.target.__data__
                const variable = d.target.parentNode.__data__
                tooltip.transition()
                    .style("visibility", "visible")
                    .text(`${variable}: ${data}`)
            })
            .on("mousemove", (d) => {
                tooltip.style("top", (d.pageY - 10) + "px")
                    .style("left", (d.pageX + 10) + "px");
            })
            .on("mouseout", () => {
                tooltip.style("visibility", "hidden")
            });
        angle -= divisionSpace
        circleCount++
    }
}

const generateCircles = () => {

    const interceptionArray = [intercept1, intercept2, intercept3]
    svg.select('#radial-circles')
        .selectAll('circle')
        .data(interceptionArray)
        .enter()
        .append('circle')
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', interception => interception)
        .attr('stroke-width', 1)
        .attr("stroke", "gray")
        .attr("fill", "none")
}

let tooltip = d3.select('body')
    .append('div')
    .attr('id', 'tooltip')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('z-index', '10')
    .style('width', 'auto')
    .style('height', 'auto')
    .style('visibility', 'hidden')

const randomColor = () => {
    return Math.random() * 255;
}

const getMinMax = (data) => {
    const dataArray = []
    for (const key in data) {
        data[key].forEach(value => dataArray.push(value))
    }
    const min = Math.min(...dataArray)
    const max = Math.max(...dataArray)
    return [min, max]
}

const normalize = (x, min, max) => {
    const augmentFactor = 55
    const normalized = augmentFactor * (x - min) / (max - min)
    return normalized
}

const isRealVariable = (variable) => {
    return !variable.includes('cod') && !variable.includes('cluster')
}

//helper objet for setting circles color depending on the dataset type
const colorCode = {
    hex: {
        red: '#FF0066', //->red
        green: '#99CC33', //->green
        blue: '#62D1ED' //->blue
    },
    rgba: {
        red: 'rgba(255, 0, 102, 0.7)', //->red
        green: 'rgba(153, 204, 51, 0.7)', //->green
        blue: 'rgba(98, 209, 237, 0.7)',  //->blue
    }
}
const datasetColorHelper = {
    'M1': {
        27: colorCode.hex.red, //->red
        64: colorCode.hex.green, //->green
        77: colorCode.hex.blue,  //->blue
    },
    'M2': {
        22: colorCode.hex.red,
        61: colorCode.hex.green,
        78: colorCode.hex.blue
    },
    'M3': {
        15: colorCode.hex.red,
        48: colorCode.hex.green,
        55: colorCode.hex.blue
    },
    'M4': {
        18: colorCode.hex.red,
        60: colorCode.hex.green,
        71: colorCode.hex.blue
    },
    'M5': {
        20: colorCode.hex.red,
        54: colorCode.hex.green,
        63: colorCode.hex.blue
    },
    'M6': {
        25: colorCode.hex.red,
        66: colorCode.hex.green,
        79: colorCode.hex.blue
    },
}

const getCircleColor = (currentCircleNumber) => {
    let color = 'white'
    const colorRange = datasetColorHelper[datasetType]
    const [redValue, greenValue, blueValue] = Object.keys(colorRange)
    if (currentCircleNumber <= redValue) {
        color = colorRange[redValue]
    } else if (currentCircleNumber <= greenValue) {
        color = colorRange[greenValue]
    } else {
        color = colorRange[blueValue]
    }
    return color
}

const inputElement = document.getElementById("select-file");
inputElement.addEventListener("change", handleFiles, false);
function handleFiles() {
    const { name: fileName } = this.files[0]/* now you can work with the file list */
    currentFileName = fileName
    console.log(fileName)
    generateGraph(fileName)
}

const cleanCanvas = () => {
    d3.selectAll('g').remove()
    d3.selectAll('text').remove()
    d3.selectAll('style').remove()

    svg.append('g')
        .attr('id', 'radial-lines')

    svg.append('g')
        .attr('id', 'radial-circles')
}

const downloadImg = () => {
    if (!currentFileName) { return }
    console.log(currentFileName)
    const svgElement = document.getElementById('svg')

    const cssStyleText = getCSSStyles(svgElement);
    appendCSS(cssStyleText, svgElement);

    console.log(svgElement)
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const { width, height } = svgElement.getBBox();

    const DOMURL = window.URL || window.webkitURL || window;
    const img = new Image();
    const svg = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = DOMURL.createObjectURL(svg);
    img.onload = function () {
        const canvas = document.createElement('canvas')
        canvas.width = width + 20
        canvas.height = height + 10
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const png = canvas.toDataURL("image/png");
        // document.querySelector('body').innerHTML += '<img src="' + png + '"/>';
        download(png, 'output')
        DOMURL.revokeObjectURL(png);
    };
    img.src = url;
}

const download = function (href, name) {
    var link = document.createElement('a');
    link.download = name;
    link.style.opacity = "0";
    // document.append(link);
    link.href = href;
    link.click();
    link.remove();
}

function getCSSStyles(parentElement) {
    const selectorTextArr = [];
    // Add Parent element Id and Classes to the list
    selectorTextArr.push('#' + parentElement.id);
    for (let c = 0; c < parentElement.classList.length; c++)
        if (!contains('.' + parentElement.classList[c], selectorTextArr))
            selectorTextArr.push('.' + parentElement.classList[c]);
    // Add Children element Ids and Classes to the list
    const nodes = parentElement.getElementsByTagName("*");
    for (let i = 0; i < nodes.length; i++) {
        const id = nodes[i].id;
        if (!contains('#' + id, selectorTextArr))
            selectorTextArr.push('#' + id);
        let classes = nodes[i].classList;
        for (let c = 0; c < classes.length; c++)
            if (!contains('.' + classes[c], selectorTextArr))
                selectorTextArr.push('.' + classes[c]);
    }
    // Extract CSS Rules
    let extractedCSSText = "";
    for (let i = 0; i < document.styleSheets.length; i++) {
        const s = document.styleSheets[i];
        try {
            if (!s.cssRules) continue;
        } catch (e) {
            if (e.name !== 'SecurityError') throw e; // for Firefox
            continue;
        }
        let cssRules = s.cssRules;
        for (let r = 0; r < cssRules.length; r++) {
            if (contains(cssRules[r].selectorText, selectorTextArr))
                extractedCSSText += cssRules[r].cssText;
        }
    }
    return extractedCSSText;
    function contains(str, arr) {
        return arr.indexOf(str) === -1 ? false : true;
    }
}

function appendCSS(cssText, element) {
    const styleElement = document.createElement("style");
    styleElement.setAttribute("type", "text/css");
    styleElement.innerHTML = cssText;
    const refNode = element.hasChildNodes() ? element.children[0] : null;
    element.insertBefore(styleElement, refNode);
}