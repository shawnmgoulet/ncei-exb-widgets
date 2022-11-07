/** @jsx jsx */
import { AllWidgetProps, jsx, IMState } from 'jimu-core'
import { useState, useEffect} from 'react'
import { JimuMapView, JimuMapViewComponent } from 'jimu-arcgis'
import { defaultMessages as jimuUIMessages } from 'jimu-ui'
import { IMConfig } from '../config'

export default function Widget (props: AllWidgetProps<IMConfig>) {
  const [view, setView] = useState<JimuMapView>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (!view) { return }
    const mapView = view.view

    const updatingWatchHandle = mapView.watch(
      'updating',
      (newStatus) => {
        setIsUpdating(newStatus)
      })

    return () => {
      // remove at time componment is destroyed
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
