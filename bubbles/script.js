const w = 920;
const h = 920;
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
    0: intercept1,
    1: intercept2,
    2: intercept3,
    label: intercept4
}

//division space for the graph
let divisionSpace

d3.csv('../data.csv').then(data => {
    console.log(data)
    const variables = data.columns.filter(col => col.includes('P2V'))
    const realData = data.reduce((prev, curr) => {
        const currData = {}
        for (const key in curr) {
            if (key.includes('P2V')) {
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

    drawCanvas()
    generateRadialLines(variables)
    // generateLabels(variables)
    generateCircles()
    renderData(indexedVariables)
})


const drawCanvas = () => {
    svg.attr('width', w)
    svg.attr('height', h)
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
        .attr('stroke-width', 2)
        .attr('transform', `translate(${w / 2}, ${h / 2})`)
        .append('title')
        .text((d) => d)
    // .on('mouseover', (item) => {
    //     console.log(item.target.__data__)
    // })
}

const generateLabels = (variables) => {
    console.log(variables)
    //intial angle
    let angle = (Math.PI / 180) * 90
    for (let item of variables) {
        console.log(item)
        svg.select(`#${item}`)
            .append("text")
            .attr("x", () => {
                const xCenter = w / 2
                const xPos = xCenter + helperRadiusFunction[label] * Math.cos(angle) - 45 / 2
                return xPos
            })
            .attr("y", () => {
                const xCenter = w / 2
                const xPos = xCenter + helperRadiusFunction[label] * Math.sin(angle)
                return xPos
            })
            .text(item);
        angle -= divisionSpace
    }
}

const renderData = (chartData) => {
    const keys = Object.keys(chartData)
    console.log(chartData)
    //min-max values for normalization 
    const [minVal, maxVal] = getMinMax(chartData)
    console.log(minVal, maxVal)
    //intial angle
    let angle = (Math.PI / 180) * 90

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
            // .attr("fill", `rgb(${randomColor()}, ${randomColor()}, ${randomColor()})`)
            .on("mouseenter", (d) => {
                console.log(d)
                const data = d.target.__data__
                const variable = d.target.parentNode.__data__
                tooltip.transition()
                    .style("visibility", "visible")
                    .text(`${variable}, ${data}`)
            })
            .on("mousemove", (d) => {
                tooltip.style("top", (d.pageY - 10) + "px")
                    .style("left", (d.pageX + 10) + "px");
            })
            .on("mouseout", () => {
                tooltip.style("visibility", "hidden")
            });
        angle -= divisionSpace
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
        .attr('stroke-width', 2)
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
    // .style('visibility', 'hidden')
    .text('xddd')

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
    const augmentFactor = 60
    const normalized = augmentFactor * (x - min) / (max - min)
    return normalized
}