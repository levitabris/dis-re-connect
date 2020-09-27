//lib
import Globe from 'globe.gl'
import * as d3 from 'd3'
// import Offset from 'polygon-offset'

// style sheet
import '../styles/style.scss'

// console.log(document.getElementById('log'))
const print = (text) => (document.getElementById('log').innerHTML = text)
const parseDate = d3.utcParse('%d/%m/%Y')
const tillTime = parseDate('16/5/2020')
// or https://cdn.jsdelivr.net/npm/globe.gl@2.10.1/example/datasets/ne_110m_admin_0_countries.geojson

Promise.all([
    // fetch geojson world map
    fetch('/public/assets/ne_110m_admin_0_countries.geojson') 
        .then(res => res.json()), 
    // fetch distributions statistic about covid-19
    fetch('/public/assets/COVID19_geo_dist.csv') 
        .then(res => res.text())
        .then(csv => d3.dsvFormat(';').parse(csv, ({ dateRep, deaths, cases, countryterritoryCode, popData2018 }) =>
            ({
                  deaths: Number(deaths)
                , cases: Number(cases)
                , popData2018: Number(popData2018)
                , countryterritoryCode: countryterritoryCode.toString()
                , dateRep: parseDate(dateRep)
            })
        )),
    // fetch paper author network
    fetch('/public/assets/arcs_by_10_clean.json')
        .then(res => res.json())
    ,
    // fetch full paper info
    fetch('/public/assets/geocoded_institutions_clean.csv')
        .then(res => res.text())
        .then(csv => d3.dsvFormat(',').parse(csv))
    // ,
    // fetch 
    // fetch('/public/assets/paper_author_loc.csv')
    //     .then(res => res.text())
    //     .then(csv => d3.dsvFormat(',').parse(csv))
    ])
    // end of Promise missions
    .then(([countries, reports, arcs, institutions]) => {

        const MAP_CENTER = { lat: 34.3416, lng: 108.9398, altitude: 2.4 }
        const OPACITY = .4

        // return console.log(arcs.filter(x => x.arc.length != 1))
        const world = Globe({
                animateIn: true
              , rendererConfig: { antialias: true, alpha: true }
        })(document.getElementById('world-3d'))
            .globeImageUrl('/public/assets/earth-dark.jpg')
            .bumpImageUrl('/public/assets/earth-topology.png')
            // .backgroundImageUrl('/public/assets/night-sky.png')
            .pointOfView(MAP_CENTER, 0)

            // .enablePointerInteraction(false)
            .width(window.innerWidth * 1.2)
            .height(window.innerHeight * 1.05)

            .polygonsData(countries.features)
                .polygonGeoJsonGeometry( feature => feature.geometry)
                .polygonCapColor(() => 'rgba(0, 0, 0, 0.001)')
                .polygonStrokeColor(() => 'rgba(234, 26, 41, 1)')
                .polygonSideColor(() => 'rgba(193, 34, 84, .25)')
                .polygonLabel(country => country.properties.SUBUNIT)
                .polygonAltitude( country => {
                    // console.log(country)
                    let caseHere = reports
                    .filter(
                        r => ( r.dateRep - tillTime <= 0 )
                    ).filter(
                        r => ( r.countryterritoryCode === country.properties.ISO_A3)
                    ).map( 
                        r => r.cases / r.popData2018
                    ).reduce( 
                        (a, b) => (a + b)
                        , 0
                    )
                return Math.pow(caseHere, .5) * 5
                })
                .onPolygonClick(country => {
                    print(
                        `<h5>Institutions in ${country.properties.SUBUNIT}</h5>
                        <p>${institutions.filter(i => i.country.toString() !== 'NA').filter(i => i.country === country.properties.SUBUNIT).map(i => i.name).map(name => name).join('\n')}
                        </p>
                        `)
                    // alert(world)
                    world.arcColor((d) => d.countries.includes(country.properties.SUBUNIT) ? `rgba(0, 120, 240, ${OPACITY + .2})` : `rgba(0, 120, 240, ${OPACITY / 6})`)
                        .arcStroke((d) => d.countries.includes(country.properties.SUBUNIT) ? .5 : 0.001)
                        .arcDashGap(0.05)
                        // .arcDashAnimateTime(3500)
                })


            .arcsData(arcs)
                // .arcLabel(d => d.paper_id)
                // .arcCurveResolution(64)
                .arcAltitudeAutoScale(.5)
                // .arcCircularResolution(3)
                .arcStartLat(d => Number(d.arc[0][0]))
                .arcStartLng(d => Number(d.arc[0][1]))
                .arcEndLat(d => Number(d.arc[1][0]))
                .arcEndLng(d => Number(d.arc[1][1]))
                .arcColor(() => `rgba(0, 120, 240, ${OPACITY})`)
                .arcStroke(.2)
                .arcDashLength(0.4)
                .arcDashGap(0.2)
                .arcDashAnimateTime(2000)
                .arcLabel(d => `
                    <h2 class="paper-title">${d.title}</h2>
                    <p class="country-label">${(d.countries.length === 2 ? `${d.countries[0]} x ${d.countries[1]}` : d.countries[0])}</p>
                `)
            
            .pointsData(institutions)
                // .pointLabel(d => d.name)
                .pointLat(d => +d.lat)
                .pointLng(d => +d.lon)
                .pointRadius(.3)
                .pointAltitude(0)
                .pointResolution(12)
                .pointColor(() => `rgba(0, 120, 240, .8)`)
            
            
            // .camera(cam => {
            //     console.log(cam)
            //     return cam.setViewOffset({
            //         fullWidth: window.innerWidth
            //         , fullHeight: window.innerHeight
            //         , x: 0
            //         , y: 0
            //         , width: window.innerWidth - 20
            //         , height: window.innerHeight - 20
            //     })
            // })
            

        // world.camera(cam => {
        //         console.log(cam)
        //         return cam.setViewOffset({
        //               fullWidth: window.innerWidth + 700
        //             , fullHeight: window.innerHeight + 700
        //             , x: 0
        //             , y: 0
        //             , width: window.innerWidth 
        //             , height: window.innerHeight 
        //         })
        // })

        // Add auto-rotation
        world.controls().autoRotate = true;
        world.controls().autoRotateSpeed = 0.35;

        print(`<h5>${institutions.length} Research Institutions Worldwide Joining Hands Against COVID-19</h5>`)
    })