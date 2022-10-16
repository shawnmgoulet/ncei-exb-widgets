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
  ReactRedux
} from 'jimu-core'
import { JimuMapView, JimuMapViewComponent } from 'jimu-arcgis'
import GraphicsLayer from 'esri/layers/GraphicsLayer'
import Graphic from 'esri/Graphic'
import TileLayer from 'esri/layers/TileLayer'
import { useState, useEffect, useRef } from 'react'
import { IMConfig } from '../config'
// import defaultMessages from './translations/default'
import {
  getGraphics,
  getDepthRange,
  getPhylumCounts,
  toggleOutlineColor,
  getHighlightedGraphic
} from '../h3-utils'

const { useSelector } = ReactRedux

export default function H3Layer (props: AllWidgetProps<IMConfig>) {
  const graphicsLayerRef = useRef<GraphicsLayer>()
  const [selectedGraphic, setSelectedGraphic] = useState<Graphic|null>(null)
  const [depthRange, setDepthRange] = useState(null)
  const [phylumCounts, setPhylumCounts] = useState(null)
  const queryParamsRef = useRef(null)
  const tileLayer = new TileLayer({
    url: 'https://tiles.arcgis.com/tiles/C8EMgrsFcRFL6LrL/arcgis/rest/services/multibeam_mosaic_hillshade/MapServer'
  })

  // for convenience in JSX. cannot destruct from object because selectedGraphic may be null
  const h3 = selectedGraphic?.attributes.h3
  const pointCount = selectedGraphic?.attributes.count

  // get state for this widget
  const widgetState = useSelector((state: IMState) => {
    return state.widgetsState[props.widgetId]
  })
  queryParamsRef.current = widgetState?.queryParams

  console.log(`re-rendering H3Layer. h3 = ${h3}; queryParams = ${widgetState?.queryParams}`)

  useEffect(() => {
    console.log('queryParams changed, updating graphics layer: ', widgetState?.queryParams)
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
    if (selectedGraphic) {
      const h3 = selectedGraphic.attributes.h3
      console.log('selected hexbin changed: ', h3)
      deselectPreviousHexbin()
      toggleOutlineColor(selectedGraphic)

      // reset hexbin summary
      setDepthRange(null)
      setPhylumCounts(null)

      // use queryParamsRef to avoid having to add widgetState.queryParams to dependency array
      const whereClause = queryParamsRef.current || '1=1'

      // TODO group these in a Promise.all() and store hexbin summary in a single state variable
      getDepthRange(h3, whereClause)
        .then(results => {
          setDepthRange(results)
        })
      getPhylumCounts(h3, whereClause)
        .then(results => {
          setPhylumCounts(results)
        })
    } else {
      console.log('no selected hexbin...')
      resetHexbinSummary()
      deselectPreviousHexbin()
    }
  }, [selectedGraphic])

  function mapClickHandler (hitTestResult) {
    const graphicHits = hitTestResult.results?.filter(hitResult => hitResult.layer.type === 'graphics')
    if (graphicHits?.length === 1) {
      // console.log('hexbin clicked: ', graphicHits[0].graphic.attributes.h3)
      setSelectedGraphic(graphicHits[0].graphic)
    } else if (graphicHits?.length === 0) {
      // console.log('outside hexbin')
      setSelectedGraphic(null)
    } else {
      console.error('there should only be 0 or 1 graphics detected')
    }
  }

  function deselectPreviousHexbin () {
    // finds only the *first* highlighted graphic but there should only be 0 or 1
    const highlightedGraphic = getHighlightedGraphic(graphicsLayerRef.current)
    if (highlightedGraphic) {
      toggleOutlineColor(highlightedGraphic)
    }
  }

  function resetHexbinSummary () {
    // setH3(null)
    // setPointCount(0)
    setDepthRange(null)
    setPhylumCounts(null)
  }

  const activeViewChangeHandler = (jmv: JimuMapView) => {
    if (!jmv) {
      console.warn('no MapView')
      return
    }

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
      // queryParams not needed since initial draw is for all features
      getGraphics().then(graphics => {
        graphicsLayerRef.current.removeAll()
        graphicsLayerRef.current.graphics.addMany(graphics)
      })

      jmv.view.on('click', (evt) => {
        jmv.view.hitTest(evt, opts).then(response => mapClickHandler(response))
      })
    })
  }

  function formatHexbinSummary () {
    return (
      <div>
      {/* <p>Extent: {widgetState?.extent ? convertAndFormatCoordinates(widgetState.extent, 3) : ''}</p> */}
      {/* <p>Filter: {widgetState?.queryParams ? widgetState.queryParams : 'none'}</p> */}
      <p>Hexbin {h3} has {pointCount.toLocaleString()} sample(s)</p>
      {depthRange && phylumCounts ? '' : 'gathering summary information...'}
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
