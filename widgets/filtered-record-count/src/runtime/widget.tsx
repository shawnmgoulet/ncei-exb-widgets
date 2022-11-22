/** @jsx jsx */
import {
  AllWidgetProps,
  jsx,
  IMState,
  ReactRedux,
  QueriableDataSource,
  DataSource,
  DataSourceComponent,
  FeatureLayerQueryParams,
  SqlQueryParams
} from 'jimu-core'
import { JimuMapView, JimuMapViewComponent, FeatureLayerDataSource } from 'jimu-arcgis'
import { useState, useEffect, useRef } from 'react'
import webMercatorUtils from 'esri/geometry/support/webMercatorUtils'
import Extent from 'esri/geometry/Extent'
import { IMConfig } from '../config'
import defaultMessages from './translations/default'
import FeatureLayerView from 'esri/views/layers/FeatureLayerView'
import FeatureLayer from 'esri/layers/FeatureLayer'
import reactiveUtils from 'esri/core/reactiveUtils'
import MapView from 'esri/views/MapView'
import LayerView from 'esri/views/layers/LayerView'
import './widget.css'

// const { useSelector } = ReactRedux

// since we cannot pass Extent object from MessageAction and cannot convert to
// geographic in MessageAction due to load error using webMercatorUtils
function convertAndFormatCoordinates (coords: object, dp: number = 5) {
  // clone incoming coords Object and augment with spatialReference
  const extentProps = Object.assign({ spatialReference: { wkid: 102100 } }, coords)
  const extent = new Extent(extentProps)
  const geoExtent = webMercatorUtils.webMercatorToGeographic(extent, false) as Extent
  return `${geoExtent.xmin.toFixed(dp)}, ${geoExtent.ymin.toFixed(dp)}, ${geoExtent.xmax.toFixed(dp)}, ${geoExtent.ymax.toFixed(dp)}`
}

async function countAllSamples (dataSource: QueriableDataSource) {
  if (!dataSource) {
    throw new Error('DataSource cannot be null')
  }
  const startTime = new Date()
  const searchParams = new URLSearchParams([
    ['where', '1=1'],
    ['returnCountOnly', 'true'],
    ['f', 'json']
  ])
  // TODO replace w/ FeatureLayer query
  const response = await fetch(dataSource.url + '/query', {
    method: 'POST',
    body: searchParams
  })
  if (!response.ok) {
    console.log('failed to count total records from ' + dataSource.url)
    return
  }
  // TODO replace with FeatureDataSource#queryCount?
  // dataSource.queryCount({}).then(result => {
  //   return result.count
  // })
  console.log(`Total record count complete in ${(new Date().getTime() - startTime.getTime()) / 1000} seconds`)
  return response.json()
}

export default function Widget (props: AllWidgetProps<IMConfig>) {
  const [totalRecordCount, setTotalRecordCount] = useState(null)
  const [filteredRecordCount, setFilteredRecordCount] = useState(null)
  const [dataSource, setDataSource] = useState<FeatureLayerDataSource>()
  const [view, setView] = useState<JimuMapView>(null)
  const [serverError, setServerError] = useState(false)
  const abortControllerRef = useRef<AbortController>()

  // get state for this widget. Any change in widgetState, e.g. change of map extent
  // or datasource filter, causes widget to re-render
  // const widgetState = useSelector((state: IMState) => {
  //   return state.widgetsState[props.widgetId]
  // })
  // console.log(`rendering filtered-record-count. extent: ${convertAndFormatCoordinates(widgetState?.extent)}, queryParams: ${widgetState?.queryParams}`)

  useEffect(() => {
    if (!view) { return }

    const mapView = view.view
    // dataSource.getCurrentQueryParams().where and mapview layer.definitionExpression should be equal

    // const featureLayer = dataSource.layer
    const layer = mapView.map.layers.find(lyr => lyr.title === dataSource.layer.title) as FeatureLayer
    const jimuLayerView = Object.values(view.jimuLayerViews).find(view => view.layerDataSourceId === dataSource.id)
    let layerView: LayerView
    // __esri.LayerView == esri/views/layers/LayerView?
    if (jimuLayerView.view.layer.type === 'feature') {
      layerView = jimuLayerView.view as FeatureLayerView
    }

    // use FeatureLayer#queryFeatureCount
    function featureLayerFeatureCount () {
      // cancel any running request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()
      const startTime = new Date()
      layer.queryFeatureCount({
        geometry: mapView.extent,
        where: layer.definitionExpression
      },
      { signal: abortControllerRef.current.signal }).then(result => {
        console.log(`featureLayerFeatureCount complete in ${(new Date().getTime() - startTime.getTime()) / 1000} seconds`)
        setFilteredRecordCount(result)
      }).catch((reason) => {
        if (reason.name === 'AbortError') {
          console.log('cancelled running request')
        } else {
          console.error('featureLayerFeatureCount failed: ', reason)
          setServerError(true)
        }
      }).finally(() => {
        abortControllerRef.current = null
      })
    }

    // use FeatureLayerDataSource#loadCount
    function dataSourceFeatureCount () {
      // async request timeout idea taken from  Faraz K. Kelhini, "Modern Asynchronous JavaScript"
      const timeOut = 20000
      const failure = new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error(`server failed to response in ${timeOut} milliseconds`))
        }, timeOut)
      })

      const startTime = new Date()
      const queryParams = dataSource?.getCurrentQueryParams()
      // TODO any way to pass AbortController.signal or should move to FeatureLayer#queryFeatureCount?
      Promise.race([
        dataSource.loadCount(queryParams, { widgetId: props.id }),
        failure
      ]).then((count) => {
        console.log(`dataSourceFeatureCount complete in ${(new Date().getTime() - startTime.getTime()) / 1000} seconds`)
        setFilteredRecordCount(count)
      }).catch((reason) => {
        console.error('datasourceFeatureCount failed: ', reason)
        setServerError(true)
      })
    }

    function countFilteredFeatures () {
      setFilteredRecordCount(null)
      setServerError(false)

      if (layerView.suspended) {
        // featurelayerFeature count is usually a little slower
        featureLayerFeatureCount()
        // dataSourceFeatureCount()
      } else {
        // clientSideFeatureCount only produces results when scale threshold has been crosed and points display
        clientSideFeatureCount()
      }
    }

    const extentWatchHandle = reactiveUtils.when(
      () => mapView.stationary,
      () => {
        console.log('filtered-record-count: extent changed, updating filteredRecordCount...')
        countFilteredFeatures()
      })

    const layerDefinitionWatchHandle = reactiveUtils.watch(
      () => layer.definitionExpression,
      () => {
        console.log(`filtered-record-count: layer definitionExpression changed to ${layer.definitionExpression}, updating filteredRecordCount...`)
        countFilteredFeatures()
      })

    return () => {
      extentWatchHandle.remove()
      layerDefinitionWatchHandle.remove()
    }
  }, [view, dataSource])

  function serverSideFeatureCount () {
    if (!(dataSource && view)) {
      console.warn('DataSource and/or MapView not yet available - cannot get record count')
      return
    }
    const mapView = view.view
    const featureLayer = dataSource.layer
    featureLayer.queryFeatureCount({
      geometry: mapView.extent
    }).then(result => {
      setFilteredRecordCount(result)
    })

    // TODO why is this always the unfiltered count?
    // const countQueryParams: FeatureLayerQueryParams = {
    //   geometry: mapView.extent
    // }
    // dataSource.queryCount(countQueryParams).then(result => {
    //   return result.count
    // })
  }

  // client-side query only reports on visible features are visible so doesn't work when Webmap scale dependency set
  function clientSideFeatureCount () {
    if (!(dataSource && view)) {
      console.warn('DataSource and/or MapView not yet available - cannot get record count')
      return
    }
    const startTime = new Date()

    // get the JimuLayerView corresponding to the configured DataSource
    const jimuLayerView = Object.values(view.jimuLayerViews).find(view => view.layerDataSourceId === dataSource.id)
    const layerView = jimuLayerView.view as FeatureLayerView
    layerView.queryFeatureCount().then(count => {
      console.log(`clientSideFeatureCount complete in ${(new Date().getTime() - startTime.getTime()) / 1000} seconds`)
      console.log('clientSideFeatureCount: ', count)
      setFilteredRecordCount(count)
    })
  }

  // runs once
  function onDataSourceCreated (ds: DataSource) {
    if (!ds) { throw new Error('no DataSource') }

    const featureLayerDataSource = ds as FeatureLayerDataSource
    setDataSource(featureLayerDataSource)
    countAllSamples(featureLayerDataSource).then((response) => {
      // console.log(`counted ${response.count} total records in ${featureLayerDataSource.url}`)
      setTotalRecordCount(response.count)
    })
  }

  const activeViewChangeHandler = (jmv: JimuMapView) => {
    if (!jmv) { throw new Error('no MapView') }
    setView(jmv)
  }

  function formatCounts() {
    if (totalRecordCount !== null && filteredRecordCount !== null) {
      return <span>{filteredRecordCount.toLocaleString('en-US')} out of {totalRecordCount.toLocaleString('en-US')} records</span>
    } else if (serverError) {
      return <span>Server Error - please try again</span>
    } else {
      return <span>updating...</span>
    }
  }

  return (
    <div style={{ paddingLeft: '10px' }}>
      <DataSourceComponent
        useDataSource={props.useDataSources?.[0]}
        widgetId={props.id}
        onDataSourceCreated={onDataSourceCreated}
      />
      <JimuMapViewComponent
        useMapWidgetId={props.useMapWidgetIds?.[0]}
        onActiveViewChange={activeViewChangeHandler}
      />

      {formatCounts()}
      {/* <p>Extent: {widgetState?.extent ? convertAndFormatCoordinates(widgetState.extent, 3) : ''}</p>
      <p>Filter: {widgetState?.queryParams ? widgetState.queryParams : 'none'}</p> */}
    </div>
  )
}
