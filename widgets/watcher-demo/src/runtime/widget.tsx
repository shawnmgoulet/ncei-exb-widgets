/** @jsx jsx */

import {
  AllWidgetProps,
  jsx,
  DataSourceComponent,
  QueriableDataSource,
  IMState,
  ReactRedux
} from 'jimu-core'
import { JimuMapView, JimuMapViewComponent } from 'jimu-arcgis'
// import defaultMessages from './translations/default'
// import { defaultMessages as jimuUIMessages } from 'jimu-ui'
import reactiveUtils from 'esri/core/reactiveUtils'
import Geometry from 'esri/geometry/Geometry'
import FeatureLayer from 'esri/layers/FeatureLayer'
import GraphicsLayer from 'esri/layers/GraphicsLayer'
import Graphic from 'esri/Graphic'
import PopupTemplate from 'esri/PopupTemplate'
import { h3ToGeoBoundary } from 'h3-js'
import { useState, useEffect } from 'react'
import { IMConfig } from '../config'

const { useSelector } = ReactRedux

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
  console.log(`retrieved ${data.features.length} records in ${(endTime.getTime() - startTime.getTime()) / 1000} seconds`)
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

async function getGraphics (whereClause = '1=1') {
  const data = await getH3Counts(whereClause)
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
      symbol: simpleFillSymbol,
      popupTemplate: graphicPopupTemplate
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

export default function WatcherDemo (props: AllWidgetProps<IMConfig>) {
  const [dataSource, setDataSource] = useState(null)
  const [view, setView] = useState<JimuMapView>(null)

  console.log('props: ', props)

  const widgetState = useSelector((state: IMState) => {
    const widgetState = state.widgetsState['widget_10']
    return widgetState
  })
  console.log('widgetState', widgetState)

  const layerName = props.config.layerName ? props.config.layerName : 'layer name not set'

  let extentWatchHandle: __esri.WatchHandle
  let stationaryWatchHandle: __esri.WatchHandle
  let queryParamsWatchHandle: __esri.WatchHandle

  // TODO can you watch stateProps?
  // reactiveUtils.watch(
  //   () => props.stateProps?.lastMessage,
  //   (lastMessage) => {
  //     console.log('lastMessage updated: ', lastMessage)
  //   })

  /*
  async function getGraphics () {
    const hexGraphic = new Graphic({
      geometry: {
        type: 'polygon',
        rings: [[
          [-116.83830158928454, 32.26038282119406],
          [-115.25400548040932, 33.43153649157358],
          [-115.64454936135779, 35.138559675017866],
          [-117.66644115562842, 35.657119683574905],
          [-119.2405536967384, 34.468622114983724],
          [-118.8045281400983, 32.77943799663874],
          [-116.83830158928454, 32.26038282119406]
        ]]
        // rings: h3.h3ToGeoBoundary(element.h3_2, true)
      },
      attributes: {
        h3: '8229a7fffffffff',
        count: 17324
      },
      symbol: simpleFillSymbol,
      popupTemplate: graphicPopupTemplate
    })
    return [hexGraphic]
  }
  */

  // runs once
  function onDataSourceCreated (ds: QueriableDataSource) {
    if (!ds) {
      console.error('unable to create DataSource')
      return
    }
    console.log('DataSource: ', ds)
    ds.ready().then(() => {
      /*
      console.log('configQueryParams: ', ds.getConfigQueryParams())
      console.log('currentQueryParams: ', ds.getCurrentQueryParams())
      console.log('runtimeQueryParams: ', ds.getRuntimeQueryParams())
      if (!queryParamsWatchHandle) {
      // TODO TypeError: Cannot read properties of undefined (reading 'getRuntimeQueryParams')
        queryParamsWatchHandle = reactiveUtils.watch(
          ds.getCurrentQueryParams,
          (oldValue, newValue) => {
            console.log('queryParamsWatch: ', oldValue, newValue)
          })
      }
      */
    })

    setDataSource(ds)
  }

  // runs once
  const activeViewChangeHandler = (jmv: JimuMapView) => {
    if (!jmv) {
      console.warn('no MapView')
      return
    }
    setView(jmv)

    // temporary debugging support
    jmv.view.on('layerview-create', (event) => {
      console.log(`LayerView for ${event.layer.title} (${event.layer.id}) created`)
    })

    jmv.view.on('click', (evt) => {
      jmv.view.hitTest(evt).then((response) => {
        // only get the graphics returned from myLayer
        const graphicHits = response.results?.filter(hitResult => hitResult.type === 'graphic')
        if (graphicHits?.length > 0) {
          graphicHits.forEach((graphicHit) => {
            console.log('attributes: ', graphicHit.graphic.attributes)
          })
        }
      })
    })

    const graphicsLayer = new GraphicsLayer()
    jmv.view.when(() => {
      jmv.view.map.add(graphicsLayer)

      if (!extentWatchHandle) {
        // better than "jmv.view.watch('extent', (newValue, oldValue) => { // take action })"?
        reactiveUtils.when(
          // getValue function
          () => jmv.view.stationary,
          // callback function
          () => {
            // TODO trigger some action
            console.log('Extent changed: ', jmv.view.extent)
          })
      }

      // alternative to watching DataSource queryParams property?
      if (!queryParamsWatchHandle) {
        // jmv.view.map.layers.forEach((it) => console.log(it.title))
        const layer = jmv.view.map.layers.find(lyr => lyr.title === layerName)
        console.log('layer: ', layer)
        queryParamsWatchHandle = layer.watch('definitionExpression', (newExpression, oldExpression) => {
          // TODO trigger some action
          console.log('layerDefinition changed: ', newExpression)
        })
      }
    }).then(async () => {
      const graphicsAllFeatures = await getGraphics()
      graphicsLayer.removeAll()
      graphicsLayer.graphics.addMany(graphicsAllFeatures)
      // TODO "No layerview has been found for the layer" error. see https://community.esri.com/t5/arcgis-api-for-javascript-questions/esri-js-api-4-11-no-layerview-has-been-found-for/m-p/560558#M52302
      const featureLayer = createLayer(graphicsAllFeatures)
      featureLayer.watch('loadStatus', () => console.log(`featureLayer loadStatus changed to ${featureLayer.loadStatus}...`))
      // featureLayer.when(() => {
      //   console.log('featureLayer loaded: ', featureLayer)
      // })
      featureLayer.popupTemplate = featurePopupTemplate
      jmv.view.map.add(featureLayer)
    })
  }

  // fires only once, when widget initially opened
  useEffect(() => {
    // one-time cleanup function
    return function cleanup () {
      // remove at time componment is destroyed
      if (extentWatchHandle) {
        extentWatchHandle.remove()
      }
      if (stationaryWatchHandle) {
        stationaryWatchHandle.remove()
      }
      if (queryParamsWatchHandle) {
        stationaryWatchHandle.remove()
      }
    }
  }, [])

  return (
    <div className="widget-demo jimu-widget m-2">
      <DataSourceComponent
        useDataSource={props.useDataSources?.[0]}
        widgetId={props.id}
        onDataSourceCreated={onDataSourceCreated}
      />
      <JimuMapViewComponent
        useMapWidgetId={props.useMapWidgetIds?.[0]}
        onActiveViewChange={activeViewChangeHandler}
      />
      <p>Layer name: {layerName}</p>
      {/* <p>isUpdating: {isUpdating}</p>
      <p>updateQueued: {updateQueued}</p> */}
      {/* {props.stateProps?.lastMessage && <p>lastMessage: {props.stateProps?.lastMessage}</p>} */}
    </div>
  )
}

// called everytime any widget updates shared store?
// SubscriberDemo.mapExtraStateProps = (state: IMState, ownProps: AllWidgetProps<IMConfig>): ExtraProps => {
// console.log('inside mapExtraStateProps')
// let wId: string
// // will trigger for 'lastMessage' property in ANY widget
// for (const [key, value] of Object.entries(state.widgetsState)) {
//   if (value.lastMessage) {
//     wId = key
//     console.log(`widget ${key}: `, value)
//   }
// }
// if (wId) {
//   return { lastMessage: state.widgetsState[wId]?.lastMessage }
// } else {
//   return { lastMessage: '' }
// }
// }
