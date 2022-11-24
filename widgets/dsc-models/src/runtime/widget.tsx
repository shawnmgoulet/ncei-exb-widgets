/** @jsx jsx */

import {
  AllWidgetProps,
  jsx
} from 'jimu-core'
import { JimuMapView, JimuMapViewComponent } from 'jimu-arcgis'
import { CalciteSelect, CalciteOption, CalciteOptionGroup } from 'calcite-components'
// import defaultMessages from './translations/default'
// import { defaultMessages as jimuUIMessages } from 'jimu-ui'
import React, { useState, useEffect, MouseEventHandler } from 'react'
import { IMConfig } from '../config'
import MapImageLayer from 'esri/layers/MapImageLayer'
import { Button, Select, Option } from 'jimu-ui'

interface ModelOption {
  id: number
  label: string
  parent?: boolean
}

export default function Widget (props: AllWidgetProps<IMConfig>) {
  const [view, setView] = useState<JimuMapView>(null)
  const [optionsList, setOptionsList] = useState<ModelOption[]>([])
  const [selectedLayerId, setSelectedLayerId] = useState(null)
  const [mapLayer, setMapLayer] = useState<MapImageLayer>()
  // runs once
  const activeViewChangeHandler = (jmv: JimuMapView) => {
    if (!jmv) {
      console.warn('no MapView')
      return
    }
    setView(jmv)
    const modelLayerView = jmv.view.layerViews.find(it => it.layer.title === props.config.modelsLayerName && it.layer.type === 'map-image')
    if (!modelLayerView) { console.warn('DSC Model layer not found!') }
    const modelLayer = modelLayerView.layer as MapImageLayer
    setMapLayer(modelLayer)

    const alllayers = modelLayer.allSublayers.map(sublayer => {
      return { id: sublayer.id, label: sublayer.title, parent: !!sublayer.sublayers }
    })
    alllayers.sort((a, b) => a.id - b.id)
    setOptionsList(alllayers.toArray())
  }

  function hideAllButtonHandler (e: React.MouseEvent<HTMLElement>) {
    mapLayer.allSublayers.forEach(it => {
      if (!it.sublayers) {
        it.visible = false
      }
    })
    setSelectedLayerId(null)
  }

  function modelLayerChangeHandler (e: React.ChangeEvent<HTMLSelectElement>) {
    const selectedId = parseInt(e.target.value)
    setSelectedLayerId(selectedId)
    mapLayer.allSublayers.forEach(it => {
      if (it.id !== selectedId && !it.sublayers) {
        it.visible = false
      } else if (it.id === selectedId) {
        it.visible = true
      }
    })
  }

  function buildSelect () {
    if (!optionsList) {
      return ''
    }
    return (
      <Select
        onChange={modelLayerChangeHandler}
        placeholder="Select a model layer..."
        value={selectedLayerId}
      >
        {optionsList.map(item => {
          if (item.parent) {
            return <Option header>{item.label}</Option>
          } else {
            return <Option value={item.id}>{item.label}</Option>
          }
        })}
  </Select>
    )
  }

  return (
    <div className="widget-demo jimu-widget" style={{ width: '90%' }}>
      <JimuMapViewComponent
        useMapWidgetId={props.useMapWidgetIds?.[0]}
        onActiveViewChange={activeViewChangeHandler}
      />
      <div style={{ width: '90%', paddingLeft: '10px', paddingRight: '10px' }}>
      {buildSelect()}
      </div>
      <div style={{ width: '90%' }}>
      <Button onClick={hideAllButtonHandler} style={{ margin: '10px' }}>Reset</Button>
      </div>
    </div>
  )
}
