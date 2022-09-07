/** @jsx jsx */
import {
  AllWidgetProps,
  jsx,
  IMState,
  ReactRedux,
  DataSourceComponent,
  QueriableDataSource
} from 'jimu-core'
import { JimuMapView, JimuMapViewComponent } from 'jimu-arcgis'
// import webMercatorUtils from 'esri/geometry/support/webMercatorUtils'
// import Extent from 'esri/geometry/Extent'
import reactiveUtils from 'esri/core/reactiveUtils'
// import Geometry from 'esri/geometry/Geometry'
// import FeatureLayer from 'esri/layers/FeatureLayer'
import GraphicsLayer from 'esri/layers/GraphicsLayer'
import MapView from 'esri/views/MapView'
import SceneView from 'esri/views/SceneView'
// import Graphic from 'esri/Graphic'
// import PopupTemplate from 'esri/PopupTemplate'
// import { h3ToGeoBoundary } from 'h3-js'
import { useState, useEffect } from 'react'
import { IMConfig } from '../config'
import defaultMessages from './translations/default'
import {
  featurePopupTemplate,
  graphicPopupTemplate,
  simpleFillSymbol,
  getGraphics,
  getH3Counts,
  translateGraphic,
  getDepthRange,
  getPhylumCounts,
  convertAndFormatCoordinates
} from '../utils'

const { useSelector } = ReactRedux

export default function H3Layer (props: AllWidgetProps<IMConfig>) {
  const [view, setView] = useState<MapView|SceneView>(null)
  const [queryParams, setQueryParams] = useState(null)

  const layerName = props.config?.layerName ? props.config.layerName : 'layer name not set'

  // console.log('props: ', props)

  // get state for this widget
  const widgetState = useSelector((state: IMState) => {
    return state.widgetsState[props.widgetId]
  })
  // console.log('h3-layer: extent', widgetState?.extent)

  // TODO why is queryParams available here but not on line 58
  console.log('h3-layer: queryParams', widgetState?.queryParams)

  function displayHexbinSummary (hitTestResult) {
    if (!widgetState?.queryParams) { console.warn('No queryParams found') };

    const whereClause = widgetState?.queryParams || '1=1'
    // only get the graphics returned from myLayer
    const graphicHits = hitTestResult.results?.filter(hitResult => hitResult.layer.type === 'graphics')
    if (graphicHits?.length > 0) {
      graphicHits.forEach((graphicHit) => {
        const h3 = graphicHit.graphic.attributes.h3
        // TODO take some action. Message to another widget(s) to display results?
        // console.log('attributes: ', graphicHit.graphic.attributes)
        getDepthRange(h3, whereClause).then(data => console.log('depths: ', data))
        getPhylumCounts(h3, whereClause).then(data => console.log('Phylum counts: ', data))
      })
    }
  }

  const activeViewChangeHandler = (jmv: JimuMapView) => {
    if (!jmv) {
      console.warn('no MapView')
      return
    }
    setView(jmv.view)

    jmv.view.on('layerview-create', (event) => {
      console.log(`LayerView for ${event.layer.title} (${event.layer.id}) created`, widgetState?.queryParams)
    })

    const graphicsLayer = new GraphicsLayer()

    jmv.view.when(() => {
      jmv.view.map.add(graphicsLayer)
      jmv.view.on('click', (evt) => {
        jmv.view.hitTest(evt).then(response => displayHexbinSummary(response))
      })
    }).then(async () => {
      const graphicsAllFeatures = await getGraphics()
      graphicsLayer.removeAll()
      graphicsLayer.graphics.addMany(graphicsAllFeatures)
    })
  }

  return (
    <div>
      <p>Extent: {widgetState?.extent ? convertAndFormatCoordinates(widgetState.extent, 3) : ''}</p>
      <p>Filter: {widgetState?.queryParams ? widgetState.queryParams : 'none'}</p>

      <JimuMapViewComponent
        useMapWidgetId={props.useMapWidgetIds?.[0]}
        onActiveViewChange={activeViewChangeHandler}
      />
      <p>Layer name: {layerName || 'layer name required'}</p>
    </div>

  )
}
