//lib
import * as d3 from 'd3'
import Globe from 'globe.gl'
// import 'topojson-client'
// import * as topojson from 'topojson-simplify'
// import * as spo from 'svg-path-outline' TOO SlOW https://www.npmjs.com/package/svg-path-outline
// import Offset from 'polygon-offset'

// console.log(spo)

// style sheet
import '../styles/style.scss'
// import '3dGlobe.js'

// console.log(document.getElementById('log'))
const print = (text) => (document.getElementById('log').innerText = text.toString())
const parseDate = d3.utcParse('%d/%m/%Y')
let tillTime = parseDate('31/12/2019')
const updateInterval = 500

// or https://cdn.jsdelivr.net/npm/globe.gl@2.10.1/example/datasets/ne_110m_admin_0_countries.geojson

const sensitivity = 95

let boxSize = d3.select('#world-2d').node().getBoundingClientRect()

let projection = d3.geoOrthographic()
    .scale(350)
    .center([0, 0])
    .rotate([-12, -60]) // points to northern europe
    .translate([boxSize.width, boxSize.height / 2])

const initialScale = projection.scale()
let path = d3.geoPath().projection(projection)

let svg = d3.select('#world-2d')
            .append('svg')
                .attr('class', 'countries')
                .attr('width', '100%')
                .attr('height', '100%')

let globe = svg.append('circle')
                .classed('globe-outline', true)
                .attr('r', initialScale + 2)

svg.call(d3.drag().on('drag', () => {
    const rotate = projection.rotate()
    const k = sensitivity / projection.scale()
    projection.rotate([
        rotate[0] + d3.event.dx * k,
        rotate[1] - d3.event.dy * k
    ])
    path = d3.geoPath().projection(projection)
    svg.selectAll('path').attr('d', path)
}))

fetch('static/world_map.json')
    .then(res => res.json())
    .then(countries => {
        let defs = svg.append('g').attr('class', 'clip-defs')
                        .selectAll('defs')
                        .data(countries.features)
                        .enter()
                        .append('defs')

        let paths = defs
                    .append('path')
                        .attr('class', d => 'country ' + d.properties.name.replace(' ', '_'))
                        .attr('id', d => d.id)
                        .attr('d', path)

        let clips = defs
                    .append('clipPath')
                        .attr('id', x => `clip-${x.id}`)
                        .append('use')
                            .attr('xlink:href', x => `#${x.id}`)

        let uses = svg.append('g')
                        .attr('class', 'map')
                        .selectAll('g')
                        .data(countries.features)
                        .enter()
                        .append('g')
                            .append('use')
                            .attr('class', x => `use-origin use-origin-${x.id}`)
                            .attr('xlink:href', x => `#${x.id}`)
                            .attr('clip-path', x => `url(#clip-${x.id})`)

        let uses_copy = uses.clone(true).attr('class', x => `use-copy use-copy-${x.id}`)

        // print(countries.features.length)
        fetch('public/assets/COVID19_geo_dist.csv')
            .then(res => res.text())
            .then(csv => d3.dsvFormat(';').parse(csv, ({ dateRep, deaths, cases, countryterritoryCode, popData2018 }) =>
                ({
                  deaths: Number(deaths)
                , cases: Number(cases)
                , popData2018: Number(popData2018)
                , countryterritoryCode: countryterritoryCode.toString()
                , dateRep: parseDate(dateRep)
                })
            ))
            .then(reports => {
                const drawLines = () => {
                    paths.each(function (x) {
                        let caseByPop = reports.filter(r => r.countryterritoryCode === x.id).filter(r => (r.dateRep - tillTime <= 0)).map(r => r.cases / r.popData2018).reduce((a, b) => (a + b), 0)
                        let lineWidth = (Math.pow(caseByPop, .5) - 0.000) * 300        // if (!caseByPop) alert(x.id)
                        d3.select(`.use-origin-${x.id}`).style('stroke-width', lineWidth * 1.5)//.style('stroke', caseByPop ? d3.interpolateYlOrRd(Math.pow(caseByPop, .3) * 4) : 'none')
                        d3.select(`.use-copy-${x.id}`).style('stroke-width', lineWidth).style('stroke', caseByPop ? d3.interpolateYlOrRd(Math.pow(caseByPop, .3) * 4) : 'none')//
                        // print(d3.select(`.use-copy-${x.id}`))
                    })
                }

                //Optional rotate
                d3.timer(function (elapsed) {
                    const rotate = projection.rotate()
                    const k = sensitivity / projection.scale()
                    projection.rotate([
                        rotate[0] - 1 * k,
                        rotate[1]
                    ])
                    path = d3.geoPath().projection(projection)
                    svg.selectAll('path').attr("d", path)

                    tillTime =
                        tillTime < parseDate('16/5/2020') ? new Date(+tillTime + sensitivity * 24 * 60 * 60 * 15) : parseDate('16/5/2020')
                    drawLines()
                    print(tillTime)
                }, updateInterval)

            })

    })
