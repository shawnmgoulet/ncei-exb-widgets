import FeatureLayer from 'esri/layers/FeatureLayer'
import Graphic from 'esri/Graphic'
import webMercatorUtils from 'esri/geometry/support/webMercatorUtils'
import Extent from 'esri/geometry/Extent'
import PopupTemplate from 'esri/PopupTemplate'
import SimpleFillSymbol from 'esri/symbols/SimpleFillSymbol'
import jsonUtils from 'esri/symbols/support/jsonUtils'
import { h3ToGeoBoundary } from 'h3-js'
import WhereClause from 'esri/core/sql/WhereClause'

function helloWorld (name: string = 'World'): string {
  return `Hello ${name}!`
}


const featurePopupTemplate = new PopupTemplate({
  title: 'Feature Layer: {h3}',
  content: (event) => {
    try {
      const formattedCount = parseInt(event.graphic.attributes.count).toLocaleString()
      return `${formattedCount} soundings within this hexbin.<br/>Center is ${event.graphic.geometry.centroid.longitude.toFixed(5)}, ${event.graphic.geometry.centroid.latitude.toFixed(5)} lon/lat`
    } catch (e) {
      console.error(e.toString())
      return 'error producing popup content'
    }
  }
})

// no longer being used
const graphicPopupTemplate = new PopupTemplate({
  title: 'Graphic Layer: {h3}',
  content: (event) => {
    try {
      const formattedCount = parseInt(event.graphic.attributes.count).toLocaleString()
      return `${formattedCount} soundings within this hexbin.<br/>Center is ${event.graphic.geometry.centroid.longitude.toFixed(5)}, ${event.graphic.geometry.centroid.latitude.toFixed(5)} lon/lat`
    } catch (e) {
      console.error(e.toString())
      return 'unable to produce popup content'
    }
  }
})

function createLayer (graphics) {
  return new FeatureLayer({
    source: graphics,
    spatialReference: { wkid: 4326 },
    objectIdField: 'ObjectID',
    outFields: ['*'],
    title: 'hexagons',
    fields: [
      {
        name: 'ObjectID',
        type: 'oid'
      },
      {
        name: 'count',
        type: 'integer'
      },
      {
        name: 'h3',
        type: 'string'
      }
    ]
  })
}

// TODO Graphic layer geometries look OK but Feature layer geometries are not drawing correctly across AM
// WARNING: function mutates the provided geometry
function translateGraphic (graphic) {
  const shiftedRings = []

  if (graphic.geometry.rings.length > 1) {
    console.warn('function only supports simple geometries')
    return
  }
  graphic.geometry.rings[0].forEach(pair => {
    if (pair[0] < 0) {
      shiftedRings.push([pair[0] + 360, pair[1]])
    } else {
      shiftedRings.push(pair)
    }
  })
  graphic.geometry.rings = [shiftedRings]
}

async function getH3Counts (whereClause) {
  const startTime = new Date()
  const featureServiceUrl = 'https://services2.arcgis.com/C8EMgrsFcRFL6LrL/ArcGIS/rest/services/DSCRTP_NatDB_FeatureLayer/FeatureServer/0/query?'
  const searchParams = new URLSearchParams()
  searchParams.set('where', whereClause)
  searchParams.set('outFields', 'h3_2')
  searchParams.set('groupByFieldsForStatistics', 'h3_2')
  searchParams.set('outStatistics', '[{"statisticType":"count","onStatisticField":"h3_2","outStatisticFieldName":"Count"}]')
  searchParams.set('returnGeometry', 'false')
  searchParams.set('f', 'json')

  const response = await fetch(featureServiceUrl, {
    method: 'POST',
    body: searchParams
  })
  if (!response.ok) {
    console.warn('Error fetching data from: ' + featureServiceUrl)
    return
  }
  const data = await response.json()
  const endTime = new Date()
  console.debug(`retrieved ${data.features.length} records in ${(endTime.getTime() - startTime.getTime()) / 1000} seconds`)
  return data.features.map(it => it.attributes)
}

async function getDepthRange (h3, whereClause = '1=1') {
  const startTime = new Date()
  const featureServiceUrl = 'https://services2.arcgis.com/C8EMgrsFcRFL6LrL/ArcGIS/rest/services/DSCRTP_NatDB_FeatureLayer/FeatureServer/0/query?'
  const searchParams = new URLSearchParams()
  searchParams.set('where', `${whereClause} and h3_2='${h3}'`)
  searchParams.set('outFields', 'DepthInMeters')
  searchParams.set('outStatistics', '[{"statisticType":"Min","onStatisticField":"DepthInMeters","outStatisticFieldName":"MinDepth"},{"statisticType":"Max","onStatisticField":"DepthInMeters","outStatisticFieldName":"MaxDepth"}]')
  searchParams.set('returnGeometry', 'false')
  searchParams.set('f', 'json')

  const response = await fetch(featureServiceUrl, {
    method: 'POST',
    body: searchParams
  })
  if (!response.ok) {
    console.warn('Error fetching data from: ' + featureServiceUrl)
    return
  }
  const data = await response.json()

  const endTime = new Date()
  console.debug(`retrieved depthRange for h3 ${h3} in ${(endTime.getTime() - startTime.getTime()) / 1000} seconds`)
  return data.features[0].attributes
}

async function getPhylumCounts (h3, whereClause = '1=1') {
  const startTime = new Date()
  // TODO derive from settings.tsx
  const featureServiceUrl = 'https://services2.arcgis.com/C8EMgrsFcRFL6LrL/ArcGIS/rest/services/DSCRTP_NatDB_FeatureLayer/FeatureServer/0/query?'
  const searchParams = new URLSearchParams()
  searchParams.set('where', `${whereClause} and h3_2='${h3}'`)
  // searchParams.set('outFields', 'Phylum')
  searchParams.set('groupByFieldsForStatistics', 'Phylum')
  searchParams.set('outStatistics', '[{"statisticType":"Count","onStatisticField":"Phylum","outStatisticFieldName":"Count"}]')
  searchParams.set('returnGeometry', 'false')
  searchParams.set('f', 'json')

  const response = await fetch(featureServiceUrl, {
    method: 'POST',
    body: searchParams
  })
  if (!response.ok) {
    console.warn('Error fetching data from: ' + featureServiceUrl)
    return
  }
  const data = await response.json()

  const endTime = new Date()
  console.debug(`retrieved Phylum counts for h3 ${h3} in ${(endTime.getTime() - startTime.getTime()) / 1000} seconds`)
  return data.features.map(it => it.attributes)
}

const simpleFillSymbol = {
  type: 'simple-fill',
  color: [227, 139, 79, 0.2], // Orange, opacity 80%
  outline: {
    color: [255, 255, 255],
    width: 1
  }
}

const highlightFillSymbol = {
  type: 'simple-fill',
  color: [227, 139, 79, 0.2], // Orange, opacity 80%
  outline: {
    color: [255, 255, 0],
    width: 2
  }
}

function lookUpColor(min, max, value) {
  const classes = 5
  // TODO 
}

async function getGraphics (whereClause = '1=1') {
  const data = await getH3Counts(whereClause)
  // would reduce() be more efficient?
  // const maxCount = data.reduce((prev, curr) => Math.max(prev, curr))
  // TODO use in color classification
  const minCount = Math.min(...data.map(it => it.Count))
  const maxCount = Math.max(...data.map(it => it.Count))
  console.log(`bin counts range from ${minCount} to ${maxCount}`)
  const hexagonGraphics = []
  data.forEach(element => {
    // console.log(element.h3_2, element.Count )
    const hexGraphic = new Graphic({
      geometry: {
        type: 'polygon',
        rings: h3ToGeoBoundary(element.h3_2, true)
      },
      attributes: {
        h3: element.h3_2,
        count: element.Count
      },
      symbol: simpleFillSymbol
      // popupTemplate: graphicPopupTemplate
    })
    if (hexGraphic.geometry.extent.width > 50) {
      translateGraphic(hexGraphic)
    }
    hexagonGraphics.push(hexGraphic)
  })

  // graphicsLayer.removeAll()
  // graphicsLayer.graphics.addMany(hexagonGraphics)
  return hexagonGraphics
}

// since we cannot pass Extent object from MessageAction and cannot convert to
// geographic in MessageAction due to load error using webMercatorUtils
function convertAndFormatCoordinates (coords, dp: number = 5) {
  // clone incoming coords Object and augment with spatialReference
  const extentProps = Object.assign({ spatialReference: { wkid: 102100 } }, coords)
  const extent = new Extent(extentProps)
  const geoExtent = webMercatorUtils.webMercatorToGeographic(extent, false) as Extent
  return `${geoExtent.xmin.toFixed(dp)}, ${geoExtent.ymin.toFixed(dp)}, ${geoExtent.xmax.toFixed(dp)}, ${geoExtent.ymax.toFixed(dp)}`
}
export {
  featurePopupTemplate,
  graphicPopupTemplate,
  simpleFillSymbol,
  getGraphics,
  getH3Counts,
  translateGraphic,
  getDepthRange,
  getPhylumCounts,
  convertAndFormatCoordinates,
  createLayer,
  highlightFillSymbol
}
