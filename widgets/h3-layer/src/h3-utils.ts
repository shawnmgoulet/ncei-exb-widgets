import FeatureLayer from 'esri/layers/FeatureLayer'
import GraphicsLayer from 'esri/layers/GraphicsLayer'
import Graphic from 'esri/Graphic'
import SimpleFillSymbol from 'esri/symbols/SimpleFillSymbol'
import webMercatorUtils from 'esri/geometry/support/webMercatorUtils'
import Extent from 'esri/geometry/Extent'
import PopupTemplate from 'esri/PopupTemplate'
import { h3ToGeoBoundary } from 'h3-js'
import { Classification } from './Classification'
import Polygon from 'esri/geometry/Polygon'
import Color from 'esri/Color'

// TODO derive from settings.tsx
const featureServiceUrl = 'https://services2.arcgis.com/C8EMgrsFcRFL6LrL/ArcGIS/rest/services/DSCRTP_NatDB_FeatureLayer/FeatureServer/0/query'
const stdColor = new Color('white')
const highlightColor = new Color('yellow')

// cache the h3 counts when there are no filters applied
let noFiltersH3Counts = null

function getHighlightedGraphic (graphicsLayer: GraphicsLayer) {
  if (!graphicsLayer) {
    return
  }
  // finds only the *first* highlighted graphic but there should only be 0 or 1
  return graphicsLayer.graphics.find(graphic => {
    return stdColor.toHex() !== (graphic.symbol as SimpleFillSymbol).outline.color.toHex()
  })
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

function toggleOutlineColor (graphic: Graphic) {
  if (!graphic) { return }
  const symbolCopy = (graphic.symbol as SimpleFillSymbol).clone()

  if (stdColor.toHex() === graphic.symbol.outline.color.toHex()) {
    symbolCopy.outline.color = highlightColor
    symbolCopy.outline.width = 2
  } else {
    symbolCopy.outline.color = stdColor
    symbolCopy.outline.width = 1
  }
  graphic.symbol = symbolCopy
}

async function getH3Counts (whereClause: string) {
  if ((whereClause === '1=1' || !whereClause) && noFiltersH3Counts) {
    console.log('returning results from cache...')
    return noFiltersH3Counts
  }

  let returnExceededLimitFeatures = true
  let results = []
  const startTime = new Date()
  const searchParams = new URLSearchParams()
  searchParams.set('where', whereClause)
  searchParams.set('outFields', 'h3_2')
  searchParams.set('groupByFieldsForStatistics', 'h3_2')
  searchParams.set('outStatistics', '[{"statisticType":"count","onStatisticField":"h3_2","outStatisticFieldName":"Count"}]')
  searchParams.set('returnGeometry', 'false')
  searchParams.set('resultOffset', results.length.toString())
  searchParams.set('returnExceededLimitFeatures', true.toString())
  searchParams.set('f', 'json')

  while (returnExceededLimitFeatures) {
    const data = await makeH3Request(searchParams)
    results = results.concat(data.features.map(it => it.attributes))
    if (data.exceededTransferLimit) {
      searchParams.set('resultOffset', results.length.toString())
    } else {
      returnExceededLimitFeatures = false
    }
  }

  const endTime = new Date()
  console.log(`retrieved ${results.length} records in ${(endTime.getTime() - startTime.getTime()) / 1000} seconds`)
  if ((whereClause === '1=1' || !whereClause) && !noFiltersH3Counts) {
    noFiltersH3Counts = results
  }
  return results
}

async function makeH3Request (searchParams: URLSearchParams) {
  const response = await fetch(featureServiceUrl, {
    method: 'POST',
    body: searchParams
  })
  if (!response.ok) {
    console.warn('Error fetching data from: ' + featureServiceUrl)
    return
  }
  return (await response.json())
}

async function getDepthRange (h3, whereClause = '1=1') {
  const startTime = new Date()
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

async function getSpeciesCount (h3, whereClause = '1=1') {
  const startTime = new Date()
  const searchParams = new URLSearchParams()
  searchParams.set('where', `${whereClause} and h3_2='${h3}'`)
  searchParams.set('outFields', 'ScientificName')
  searchParams.set('returnCountOnly', 'true')
  searchParams.set('returnDistinctValues', 'true')
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
  console.debug(`retrieved species count for h3 ${h3} in ${(endTime.getTime() - startTime.getTime()) / 1000} seconds`)
  // calculate normalized value (0-100). counts range from 1 to 279 (w/o criteria applied)
  const min = 1
  const max = 279
  const normalizedValue = Math.round((data.count - min) / (max - min) * 100)
  return { rawCount: data.count, normalizedCount: normalizedValue }
}

async function getPhylumCounts (h3, whereClause = '1=1') {
  const startTime = new Date()
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

function getSimpleFillSymbol (fillColor = [227, 139, 79, 0.8]) {
  // default to Orange, opacity 80%
  // var randomColor = Math.floor(Math.random()*16777215).toString(16);
  return {
    type: 'simple-fill',
    color: fillColor,
    outline: {
      color: [255, 255, 255],
      width: 1
    }
  }
}

async function getGraphics (whereClause = '1=1') {
  const data = await getH3Counts(whereClause)
  if (!data) {
    console.error('failed to retrieve hexbin counts - unable to draw layer')
    return
  }
  // 4 classes == 5 bins
  const classification = new Classification({ bucketType: 'QNT', data: data.map(it => it.Count), numClasses: 4, transparency: 0.5 })
  await classification.load()
  console.log(`${classification.numElements} elements with values ranging from ${classification.min} to ${classification.max} with an average of ${classification.average}`)
  // console.log('breakpoints: ', classification.breakpoints)
  // classification.printBinCounts()

  const hexagonGraphics = []
  data.forEach(element => {
    // console.log(element.h3_2, element.Count )
    const hexGraphic = new Graphic({
      geometry: new Polygon({
        rings: [h3ToGeoBoundary(element.h3_2, true)]
      }),
      attributes: {
        h3: element.h3_2,
        count: element.Count
      },
      symbol: getSimpleFillSymbol(classification.getColor(element.Count))
      // popupTemplate: graphicPopupTemplate
    })
    if (hexGraphic.geometry.extent.width > 50) {
      translateGraphic(hexGraphic)
    }
    hexagonGraphics.push(hexGraphic)
  })

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
  getGraphics,
  getH3Counts,
  translateGraphic,
  getDepthRange,
  getPhylumCounts,
  convertAndFormatCoordinates,
  createLayer,
  toggleOutlineColor,
  stdColor,
  highlightColor,
  getHighlightedGraphic,
  getSpeciesCount
}
