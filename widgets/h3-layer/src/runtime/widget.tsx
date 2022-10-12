/** @jsx jsx */

/*
 * there are two runtime events which impact this widget:
 *
 * 1) mapClick
 * this only requires that the hexbin summary be updated
 *
 * 2) filter changes (i.e. DataSource queryParams)
 * this requires that the graphics layer be updated (both boundaries and symbology)
 *
 * Note that if a individual hexbin was selected at the time the queryParams
 * change, it will be deselected and the summary cleared. This is necessary
 * since a change in queryParams may cause a hexbin which was formerly displayed
 * to no longer be drawn
 */
import {
  AllWidgetProps,
  jsx,
  IMState,
  ReactRedux
} from 'jimu-core'
import { JimuMapView, JimuMapViewComponent } from 'jimu-arcgis'
import GraphicsLayer from 'esri/layers/GraphicsLayer'
import Graphic from 'esri/Graphic'
import TileLayer from 'esri/layers/TileLayer'
// import MapView from 'esri/views/MapView'
import Color from 'esri/Color'
import SimpleFillSymbol from 'esri/symbols/SimpleFillSymbol'
import { useState, useEffect, useRef } from 'react'
import { IMConfig } from '../config'
// import defaultMessages from './translations/default'
import {
  getGraphics,
  getDepthRange,
  getPhylumCounts
} from '../h3-utils'
import { Button } from 'jimu-ui'

const { useSelector } = ReactRedux

export default function H3Layer (props: AllWidgetProps<IMConfig>) {
  // const [view, setView] = useState<MapView|SceneView>(null)
  const graphicsLayerRef = useRef<GraphicsLayer>()
  const [pointCount, setPointCount] = useState<number>(0)
  const prevH3 = useRef()
  const [h3, setH3] = useState(null)
  const [depthRange, setDepthRange] = useState(null)
  const [phylumCounts, setPhylumCounts] = useState(null)
  const queryParamsRef = useRef(null)
  // const layerName = props.config?.layerName ? props.config.layerName : 'layer name not set'
  const stdColor = new Color('white')
  const highlightColor = new Color('yellow')
  const tileLayer = new TileLayer({
    url: 'https://tiles.arcgis.com/tiles/C8EMgrsFcRFL6LrL/arcgis/rest/services/multibeam_mosaic_hillshade/MapServer'
  })
  // TODO workaround to inexplicable inability to ready H3 from within mapClickHandler function
  prevH3.current = h3

  // get state for this widget
  const widgetState = useSelector((state: IMState) => {
    return state.widgetsState[props.widgetId]
  })
  queryParamsRef.current = widgetState?.queryParams

  useEffect(() => {
    console.log(`inside useEffect: h3 = ${h3}; queryParams = ${widgetState?.queryParams}`)
  })

  useEffect(() => {
    console.debug('queryParams changed, updating graphics layer: ', widgetState?.queryParams)
    resetHexbinSummary()
    updateGraphicsLayer()
  }, [widgetState?.queryParams])

  function deselectPreviousHexbin () {
    // finds only the *first* highlighted graphic but there should only be 0 or 1
    const highlightedGraphic = graphicsLayerRef.current.graphics.find(graphic => {
      return stdColor.toHex() !== (graphic.symbol as SimpleFillSymbol).outline.color.toHex()
    })
    toggleOutlineColor(highlightedGraphic)
  }

  function highlightHexbin (graphic: Graphic) {
    deselectPreviousHexbin()
    toggleOutlineColor(graphic)
    setH3(graphic.attributes.h3)
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

  function mapClickHandler (hitTestResult) {
    // TODO why is h3 useState variable not visible here?
    const graphicHits = hitTestResult.results?.filter(hitResult => hitResult.layer.type === 'graphics')
    // avoid expensive hexbin summary queries if selected hexbin clicked
    if (graphicHits?.length === 1 && graphicHits[0].graphic.attributes.h3 !== prevH3.current) {
      console.log('new hexbin clicked, highlight and get summary information')
      highlightHexbin(graphicHits[0].graphic)
      getHexbinSummary(graphicHits[0].graphic.attributes)
    } else if (graphicHits?.length === 0) {
      console.log('not inside hexbin')
      resetHexbinSummary()
      deselectPreviousHexbin()
    } else if (graphicHits?.length === 1) {
      console.debug('same hexbin clicked. no action necessary')
    } else {
      console.error('there should only be 0 or 1 graphics detected')
    }
  }

  function getHexbinSummary (hexbinAttributes) {
    // TODO why is widgetState.queryParams always undefined here?
    const whereClause = queryParamsRef.current || '1=1'
    const h3 = hexbinAttributes.h3
    setPointCount(hexbinAttributes.count)
    // TODO group these in a Promise.all() and store hexbin summary in a single state variable
    getDepthRange(h3, whereClause)
      .then(results => {
        setDepthRange(results)
      })
    getPhylumCounts(h3, whereClause)
      .then(results => {
        setPhylumCounts(results)
      })
  }

  function resetHexbinSummary () {
    setH3(null)
    setPointCount(0)
    setDepthRange(null)
    setPhylumCounts(null)
  }

  async function updateGraphicsLayer () {
    if (!graphicsLayerRef.current) {
      console.warn('GraphicsLayer not yet available')
      return
    }
    const graphicsAllFeatures = await getGraphics(widgetState?.queryParams)
    graphicsLayerRef.current.removeAll()
    graphicsLayerRef.current.graphics.addMany(graphicsAllFeatures)
  }

  const activeViewChangeHandler = (jmv: JimuMapView) => {
    if (!jmv) {
      console.warn('no MapView')
      return
    }
    // setView(jmv.view)

    // jmv.view.on('layerview-create', (event) => {
    //   console.log(`LayerView for ${event.layer.title} (${event.layer.id}) created`, widgetState?.queryParams)
    // })

    const graphicsLayer = new GraphicsLayer({
      title: 'Hexbins',
      listMode: 'show'
    })
    graphicsLayerRef.current = graphicsLayer

    const opts = {
      include: graphicsLayer,
      exclude: tileLayer
    }

    jmv.view.when(() => {
      jmv.view.map.add(graphicsLayer)
      jmv.view.on('click', (evt) => {
        try {
          jmv.view.hitTest(evt, opts).then(response => mapClickHandler(response))
          testBtnClickHandler(evt)
        } catch (e) {
          // TODO not catching errors in identify operation
          console.error('hitTest failed: ', e)
        }
      })
    }).then(async () => {
      updateGraphicsLayer()
      // TODO try using FeatureLayer instead of Graphics Layer
      // const featureLayer: FeatureLayer = createLayer(graphicsAllFeatures)
      // featureLayer.watch('loadStatus', () => console.log(`featureLayer loadStatus changed to ${featureLayer.loadStatus}...`))
      // jmv.view.whenLayerView(featureLayer).then(function(layerView){
      //   layerView.watch("updating", function(value){
      //     console.log(`featureLayer: ${value}`)
      //   })
      // })
      // featureLayer.popupTemplate = featurePopupTemplate
      // jmv.view.map.add(featureLayer)
    })
  }

  function formatHexbinSummary () {
    return (
      <div>
      {/* <p>Extent: {widgetState?.extent ? convertAndFormatCoordinates(widgetState.extent, 3) : ''}</p> */}
      {/* <p>Filter: {widgetState?.queryParams ? widgetState.queryParams : 'none'}</p> */}
      <p>Hexbin {h3} has {pointCount.toLocaleString()} sample(s)</p>
      {depthRange
        ? <p>depths range from {depthRange.MinDepth} to {depthRange.MaxDepth}</p>
        : ''
      }
      {phylumCounts
        ? <div>
        <p>Phylum Counts:</p>
        <ul>
          {phylumCounts.map(el => { return <li>{el.Phylum}: {el.Count}</li> })}
        </ul>
      </div>
        : '' }
      </div>
    )
  }

  function testBtnClickHandler (evt: React.MouseEvent<HTMLElement>) {
    alert(`h3 = ${h3}. queryParams = ${widgetState?.queryParams}`)
  }

  return (
    <div>
      {h3 ? formatHexbinSummary() : <p>Please select a hexbin...</p>}
      <JimuMapViewComponent
        useMapWidgetId={props.useMapWidgetIds?.[0]}
        onActiveViewChange={activeViewChangeHandler}
      />
      {/* <p>Layer name: {layerName || 'layer name required'}</p> */}
      <Button onClick={testBtnClickHandler}>Click Me</Button>
    </div>

  )
}
