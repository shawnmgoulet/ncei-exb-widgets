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
 * Both are handled (indirectly) via respective useEffect hooks, i.e.
 * event changes state -> triggers re-render -> useEffect runs
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
  ReactRedux,
  appActions,
  getAppStore,
  jimuHistory
} from 'jimu-core'
import { JimuMapView, JimuMapViewComponent } from 'jimu-arcgis'
import GraphicsLayer from 'esri/layers/GraphicsLayer'
import Graphic from 'esri/Graphic'
import MapView from 'esri/views/MapView'
// import TileLayer from 'esri/layers/TileLayer'
import { useState, useEffect, useRef } from 'react'
import PhylumChart from './PhylumChart'
import { IMConfig } from '../config'
import defaultMessages from './translations/default'
import {
  getGraphics,
  getDepthRange,
  getPhylumCounts,
  toggleOutlineColor,
  getHighlightedGraphic,
  getSpeciesCount
} from '../h3-utils'

const { useSelector } = ReactRedux

interface HexbinSummary {
  minDepth: number
  maxDepth: number
  phylumCounts: PhylumCount[]
  speciesCount: SpeciesCount
}

interface PhylumCount {
  Count: number
  Phylum: string
}

interface SpeciesCount {
  rawCount: number
  normalizedCount: number
}

// WARNING: hardcoded value
const sidebarWidgetId = 'widget_8'

export default function H3Layer (props: AllWidgetProps<IMConfig>) {
  const graphicsLayerRef = useRef<GraphicsLayer>()
  const [selectedGraphic, setSelectedGraphic] = useState<Graphic|null>(null)
  const [hexbinSummary, setHexbinSummary] = useState<HexbinSummary>()
  const [serverError, setServerError] = useState(false)
  const queryParamsRef = useRef(null)
  const mapViewRef = useRef<MapView>(null)
  // const tileLayer = new TileLayer({
  //   url: 'https://tiles.arcgis.com/tiles/C8EMgrsFcRFL6LrL/arcgis/rest/services/multibeam_mosaic_hillshade/MapServer'
  // })

  // for convenience in JSX. cannot destruct from object because selectedGraphic may be null
  const h3 = selectedGraphic?.attributes.h3
  const pointCount = selectedGraphic?.attributes.count

  // get state for this widget
  const widgetState = useSelector((state: IMState) => {
    return state.widgetsState[props.widgetId]
  })
  queryParamsRef.current = widgetState?.queryParams

  // console.log(`re-rendering H3Layer. h3 = ${h3}; queryParams = ${widgetState?.queryParams}`)

  // Get the widget state - because the sidebar state may change in the runtime, via Redux's useSelector hook
  const sidebarWidgetState = useSelector((state: IMState) => {
    const widgetState = state.widgetsState[sidebarWidgetId]
    return widgetState
  })

  const handleExpandSidebar = (sectionId: string, viewId: string): void => {
    if (sidebarWidgetState && sidebarWidgetState.collapse === false) {
      getAppStore().dispatch(appActions.widgetStatePropChange(
        sidebarWidgetId,
        'collapse',
        true
      ))
      jimuHistory.changeView(sectionId, viewId)
    }
  }

  useEffect(() => {
    // console.log('queryParams changed, updating graphics layer: ', widgetState?.queryParams)
    resetHexbinSummary()
    if (!graphicsLayerRef.current) {
      console.warn('GraphicsLayer not yet available')
      return
    }

    getGraphics(widgetState?.queryParams).then(graphics => {
      graphicsLayerRef.current.removeAll()
      graphicsLayerRef.current.graphics.addMany(graphics)
    })
  }, [widgetState?.queryParams])

  useEffect(() => {
    console.log('inside useEffect...')
    if (selectedGraphic) {
      const h3 = selectedGraphic.attributes.h3
      console.log('selected hexbin changed: ', h3)
      deselectPreviousHexbin()
      toggleOutlineColor(selectedGraphic)

      // reset hexbin summary
      setHexbinSummary(null)
      setServerError(null)

      // use queryParamsRef to avoid having to add widgetState.queryParams to dependency array
      const whereClause = queryParamsRef.current || '1=1'

      Promise.all([
        getDepthRange(h3, whereClause),
        getPhylumCounts(h3, whereClause),
        getSpeciesCount(h3, whereClause)
      ]).then(([depthRange, phylumCounts, speciesCount]) => {
        setHexbinSummary({
          minDepth: depthRange.MinDepth,
          maxDepth: depthRange.MaxDepth,
          phylumCounts,
          speciesCount
        })
        console.log('promises completed: ', depthRange, phylumCounts, speciesCount)
      }).catch((reason) => {
        console.error('Error getting HexbinSummary. ', reason)
        setServerError(reason)
      })
    } else {
      console.log('no selected hexbin...')
      resetHexbinSummary()
      deselectPreviousHexbin()
    }
    console.log('leaving useEffect...')
  }, [selectedGraphic])

  function mapClickHandler (hitTestResult: __esri.HitTestResult, evt: __esri.ViewClickEvent) {
    console.log('inside mapClickHandler with : ', hitTestResult, evt)
    const featureHits = hitTestResult.results?.filter(hitResult =>
      hitResult.type === 'graphic' && hitResult.layer.type === 'feature'
    ) as __esri.GraphicHit[]
    const graphicHits = hitTestResult.results?.filter(hitResult =>
      hitResult.type === 'graphic' && hitResult.layer.type === 'graphics'
    ) as __esri.GraphicHit[]
    console.log(`${featureHits?.length || 0} features; ${graphicHits?.length || 0} hexbins`)

    if (graphicHits?.length === 1) {
      console.log('hexbin clicked: ', graphicHits[0].graphic.attributes.h3)
      setSelectedGraphic(graphicHits[0].graphic)
    } else if (graphicHits?.length === 0) {
      console.log('outside hexbin')
      setSelectedGraphic(null)
    } else {
      // when click lands on hexbin boundary, arbitrarily use the first element in array
      console.log('click landed on hexbin boundary...')
      setSelectedGraphic(graphicHits[0].graphic)
    }
    console.log('open sidepanel if necessary')
    // open side panel and select view. featureHits takes priority
    if (featureHits.length) {
      handleExpandSidebar('section_2', 'view_4')
    } else if (graphicHits.length) {
      handleExpandSidebar('section_2', 'view_5')
    } else {
      // no hits. collapse side panel?
      console.log('no hits - leave sidepanel in current state')
    }

    // HACK - force popup visibility
    if (featureHits.length && !mapViewRef.current.popup.visible) {
      mapViewRef.current.popup.visible = true
      console.warn('forcing popup to display')
    } else if (!featureHits.length && mapViewRef.current.popup.visible) {
      mapViewRef.current.popup.visible = false
      console.warn('forcing popup to hide')
    }

    console.log('leaving mapClickHandler...')
  }

  function deselectPreviousHexbin () {
    // finds only the *first* highlighted graphic but there should never be > 1
    const highlightedGraphic = getHighlightedGraphic(graphicsLayerRef.current)
    if (highlightedGraphic) {
      toggleOutlineColor(highlightedGraphic)
    }
  }

  function resetHexbinSummary () {
    setSelectedGraphic(null)
    setHexbinSummary(null)
  }

  const activeViewChangeHandler = (jmv: JimuMapView) => {
    if (!jmv) {
      console.warn('no MapView')
      return
    }
    mapViewRef.current = jmv.view as MapView
    const graphicsLayer = new GraphicsLayer({
      title: 'Hexbins',
      listMode: 'show'
    })
    graphicsLayerRef.current = graphicsLayer

    // const opts = {
    //   include: graphicsLayer,
    //   exclude: tileLayer
    // }

    jmv.view.when(() => {
      // TODO why is this not working? i.e. popups still appear
      jmv.view.popup.autoOpenEnabled = false

      jmv.view.map.add(graphicsLayer)
      // queryParams not needed since initial draw is for all features
      getGraphics().then(graphics => {
        graphicsLayerRef.current.removeAll()
        graphicsLayerRef.current.graphics.addMany(graphics)
      })

      jmv.view.on('click', (evt) => {
        console.log('mapclick detected: ', evt)
        // HACK - force any previously opened popup to close
        if (jmv.view.popup.visible) { jmv.view.popup.visible = false }

        jmv.view.hitTest(evt)
          .then((response: __esri.HitTestResult) => {
            console.log('before mapClickHandler...')
            mapClickHandler(response, evt)
            console.log('after mapClickHandler...')
          })
          .catch(e => console.error('Error in hitTest: ', e))
      })
    }) // end MapView#when
  } // end activeViewChangeHandler

  function formatHexbinSummary () {
    if (serverError) {
      return (
        <div>
          <p>Hexbin {h3} has {pointCount.toLocaleString()} sample(s)</p>
          <span>Server Error - currently unable to collect statistics, please try again</span>
        </div>
      )
    } else {
      return (
      <div>
        {/* <p>Extent: {widgetState?.extent ? convertAndFormatCoordinates(widgetState.extent, 3) : ''}</p> */}
        {/* <p>Filter: {widgetState?.queryParams ? widgetState.queryParams : 'none'}</p> */}
        <p style={{ fontSize: 'medium' }}> Hexbin {h3} has <span style={{ fontSize: 'large', fontWeight: 'bold' }}>{pointCount.toLocaleString()}</span> sample(s)</p>

        {hexbinSummary
          ? <div>
              <p style={{ fontSize: 'medium' }}>depths range from <span style={{ fontSize: 'large', fontWeight: 'bold' }}>{hexbinSummary.minDepth}</span> to <span style={{ fontSize: 'large', fontWeight: 'bold' }}>{hexbinSummary.maxDepth}</span></p>
              <div>
                <p style={{ fontSize: 'medium' }}>Phylum Counts:</p>
                {/* <ul>
                  {hexbinSummary.phylumCounts.map(el => { return <li>{el.Phylum}: {el.Count}</li> })}
                </ul> */}
                <PhylumChart data={hexbinSummary.phylumCounts}/>
              </div>
              <p style={{ fontSize: 'medium' }}><span style={{ fontSize: 'large', fontWeight: 'bold' }}>{hexbinSummary.speciesCount.rawCount}</span> unique scientific name(s)</p>

            </div>
          : 'gathering summary information...'
        }
      </div>
      )
    }
  }

  return (
    <div>
      {h3 ? formatHexbinSummary() : <p>Please select a hexbin...</p>}
      <JimuMapViewComponent
        useMapWidgetId={props.useMapWidgetIds?.[0]}
        onActiveViewChange={activeViewChangeHandler}
      />
    </div>

  )
}
