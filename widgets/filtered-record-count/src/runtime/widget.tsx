/** @jsx jsx */
import {
  AllWidgetProps,
  jsx,
  IMState,
  ReactRedux,
  QueriableDataSource,
  DataSource,
  DataSourceComponent
} from 'jimu-core'
import { JimuMapView, JimuMapViewComponent } from 'jimu-arcgis'
import { useState, useEffect } from 'react'
import webMercatorUtils from 'esri/geometry/support/webMercatorUtils'
import Extent from 'esri/geometry/Extent'
import { IMConfig } from '../config'
import defaultMessages from './translations/default'

const { useSelector } = ReactRedux

// since we cannot pass Extent object from MessageAction and cannot convert to
// geographic in MessageAction due to load error using webMercatorUtils
function convertAndFormatCoordinates (coords: number, dp: number = 5) {
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
  // console.log(response)
  if (!response.ok) {
    console.log('failed to count total records from ' + dataSource.url)
    return
  }
  return response.json()
}

export default function Widget (props: AllWidgetProps<IMConfig>) {
  const [totalRecordCount, setTotalRecordCount] = useState(null)
  const [dataSource, setDataSource] = useState<QueriableDataSource>()
  const [view, setView] = useState<JimuMapView>(null)

  // get state for this widget. Any change in widgetState, e.g. change of map extent
  // or datasource filter, causes widget to re-render
  const widgetState = useSelector((state: IMState) => {
    return state.widgetsState[props.widgetId]
  })
  console.log(widgetState?.extent)
  console.log(widgetState?.queryParams)

  // runs once
  function onDataSourceCreated (ds: DataSource) {
    console.log('inside onDataSourceCreated...')
    if (!ds) { throw new Error('no DataSource') }

    const qds = ds as QueriableDataSource
    setDataSource(qds)
    countAllSamples(qds).then((response) => {
      console.log(`counted ${response.count} total records in ${qds.url}`)
      setTotalRecordCount(response.count)
    })
  }

  const activeViewChangeHandler = (jmv: JimuMapView) => {
    console.log('inside activeViewChangeHandler...')
    if (!jmv) { throw new Error('no MapView') }
    console.log(jmv)
    setView(jmv)
    // TODO get handle on LayerView
  }

  // get filtered count every time widget re-renders since the only state that
  // routinely changes is extent and queryParams
  console.log('updating filtered count...')

  return (
    <div>
      <DataSourceComponent
        useDataSource={props.useDataSources?.[0]}
        widgetId={props.id}
        onDataSourceCreated={onDataSourceCreated}
      />
      <JimuMapViewComponent
        useMapWidgetId={props.useMapWidgetIds?.[0]}
        onActiveViewChange={activeViewChangeHandler}
      />
      {totalRecordCount}
      {/* <p>Extent: {widgetState?.extent ? convertAndFormatCoordinates(widgetState.extent, 3) : ''}</p>
      <p>Filter: {widgetState?.queryParams ? widgetState.queryParams : 'none'}</p> */}
    </div>
  )
}
