/**
  Licensing

  Copyright 2022 Esri

  Licensed under the Apache License, Version 2.0 (the "License"); You
  may not use this file except in compliance with the License. You may
  obtain a copy of the License at
  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
  implied. See the License for the specific language governing
  permissions and limitations under the License.

  A copy of the license is available in the repository's
  LICENSE file.
*/
import { AllWidgetProps, React, IMState, ReactRedux, appActions, getAppStore, DataSourceManager, DataSourceComponent } from 'jimu-core'
import { JimuMapView, JimuMapViewComponent } from 'jimu-arcgis'
import { IMConfig } from '../config'
import defaultMessages from './translations/default'
import { useState, useRef } from 'react'
const { useSelector } = ReactRedux

export default function Widget (props: AllWidgetProps<IMConfig>) {
  const pointLayerTitle = useRef('no DataSource set')

  const isDsConfigured = () => {
    return props.useDataSources && props.useDataSources.length === 1
  }

  // WARNING: hardcoded value
  const sidebarWidgetId = 'widget_8'

  if (isDsConfigured()) {
    const dataSource = DataSourceManager.getInstance().getDataSource(props.useDataSources[0].dataSourceId)
    pointLayerTitle.current = dataSource.getLabel()
  }

  // Get the widget state - because the sidebar state may change in the runtime, via Redux's useSelector hook
  const widgetState = useSelector((state: IMState) => {
    const widgetState = state.widgetsState[sidebarWidgetId]
    return widgetState
  })

  const handleExpandSidebar = (): void => {
    if (widgetState && widgetState.collapse === false) {
      getAppStore().dispatch(appActions.widgetStatePropChange(
        sidebarWidgetId,
        'collapse',
        true
      ))
    } else {
      alert(
        defaultMessages.sidebarAlert
      )
    }
  }

  // only called when widget first loaded
  const activeViewChangeHandler = (jmv: JimuMapView) => {
    if (!jmv) {
      // console.warn('no MapView')
      return
    }

    jmv.view.on('click', (evt) => {
      jmv.view.hitTest(evt).then((response) => {
        const coralHits = response.results?.filter(hitResult => hitResult.layer.title === pointLayerTitle.current)
        if (coralHits.length) {
          handleExpandSidebar()
        }
      })
    })
  }

  return (
    <div className="widget-demo-function jimu-widget" style={{ overflow: 'auto' }}>
      {/* {sidebarWidgetId && widgetState.collapse === false &&
      <Button
        onClick={handleExpandSidebar}
        htmlType='submit'
        type='primary'
        title={defaultMessages.sidebarButtonLabel}
      >
      {defaultMessages.sidebarButtonLabel}
      </Button>
      } */}
      <DataSourceComponent useDataSource={props?.useDataSources[0]} widgetId={props.id} />
      <JimuMapViewComponent
        useMapWidgetId={props.useMapWidgetIds?.[0]}
        onActiveViewChange={activeViewChangeHandler}></JimuMapViewComponent>
    </div>
  )
}
