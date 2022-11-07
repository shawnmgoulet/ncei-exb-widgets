/** @jsx jsx */
import { AllWidgetProps, jsx, IMState } from 'jimu-core'
import { useState, useEffect, useMemo } from 'react'
import { JimuMapView, JimuMapViewComponent } from 'jimu-arcgis'
import reactiveUtils from 'esri/core/reactiveUtils'
import { defaultMessages as jimuUIMessages } from 'jimu-ui'
import { IMConfig } from '../config'

interface ExtraProps {
  sqlString: any
}

// taken from Josh Comeau (https://www.joshwcomeau.com/snippets/javascript/debounce/)
const debounce = (callback, wait: number) => {
  let timeoutId = null
  return (...args) => {
    window.clearTimeout(timeoutId)
    timeoutId = window.setTimeout(() => {
      callback.apply(null, args)
    }, wait)
  }
}

export default function Widget (props: AllWidgetProps<IMConfig> & ExtraProps) {
  const [view, setView] = useState<JimuMapView>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // TODO debounce not working because need to ensure a "false" value always applied at the end
  // of an update cycle
  const handleMapUpdating = useMemo(
    () => debounce((val) => {
      setIsUpdating(val)
    }, 1000),
    []
  )

  useEffect(() => {
    if (!view) { return }
    const mapView = view.view

    const extentWatchHandle = reactiveUtils.watch(
      () => mapView.stationary,
      (value) => {
        console.log(`MapView is stationary: ${value}`)
        // setIsUpdating(!value)
      })

    const updatingWatchHandle = mapView.watch(
      'updating',
      (newStatus) => {
        // handleMapUpdating(newStatus)
        setIsUpdating(newStatus)
      })

    return function cleanup () {
      // remove at time componment is destroyed
      if (extentWatchHandle) {
        extentWatchHandle.remove()
      }
      if (updatingWatchHandle) {
        updatingWatchHandle.remove()
      }
    }
  }, [view])

  // only called when widget first loaded
  const activeViewChangeHandler = (jmv: JimuMapView) => {
    if (!jmv) { throw new Error('no MapView') }
    setView(jmv)
  }

  return (
    <div className="widget-use-map-view" style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <JimuMapViewComponent
        useMapWidgetId={props.useMapWidgetIds?.[0]}
        onActiveViewChange={activeViewChangeHandler}>
      </JimuMapViewComponent>

      <div style={{ overflowY: 'auto', height: '100%', paddingLeft: '5px' }}>
        {(!view)
          ? <div>
              <span>MapView must be configured</span>
            </div>
          : ''
        }
        {(isUpdating)
          ? <span style={{ fontSize: 'medium', color: 'red' }}>map is updating...</span>
          : ''}
      </div>
    </div>
  )
}
