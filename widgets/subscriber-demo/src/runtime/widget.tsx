/** @jsx jsx */
import {
  AllWidgetProps,
  jsx,
  DataSourceComponent,
  QueriableDataSource
} from 'jimu-core'
import { JimuMapView, JimuMapViewComponent } from 'jimu-arcgis'
// import defaultMessages from './translations/default'
// import { defaultMessages as jimuUIMessages } from 'jimu-ui'
import reactiveUtils from 'esri/core/reactiveUtils'
import Accessor from 'esri/core/core/Accessor'
import { useState, useEffect } from 'react'
import { IMConfig } from '../config'

export default function SubscriberDemo (props: AllWidgetProps<IMConfig>) {
  const [dataSource, setDataSource] = useState(null)
  const [view, setView] = useState<JimuMapView>(null)

  // const [lastMessage, setLastMessage] = useState<string>('')
  const lastMessage = props.stateProps?.lastMessage
  console.log('rendering SubscriberDemo. props: ', props)

  const featureServiceUrl = props.config.featureServiceUrl ? props.config.featureServiceUrl : 'feature service URL not set'
  // console.log('featureServiceUrl: ', featureServiceUrl)
  // console.log('mapView: ', view)
  // console.log('dataSource: ', dataSource)

  // TODO how should these be typed?
  // NOTE
  // WatchHandles are objects - https://developers.arcgis.com/javascript/latest/api-reference/esri-core-Accessor.html#WatchHandle 
  // Accessor - https://developers.arcgis.com/javascript/latest/api-reference/esri-core-Accessor.html
  let extentWatchHandle: Accessor
  let stationaryWatchHandle: Accessor
  let queryParamsWatchHandle: Accessor

  // TODO why is this not working?
  // reactiveUtils.watch(
    // NOTE
    // https://developers.arcgis.com/javascript/latest/api-reference/esri-core-Accessor.html#watch
    // need to feed the watch method a path (string or array of strings representing the property or properties to watch)
  //   () => props.stateProps?.lastMessage,
  //   (lastMessage) => {
  //     console.log('lastMessage updated: ', lastMessage)
  //   })

  // runs once
  function onDataSourceCreated (ds: QueriableDataSource) {
    if (!ds) {
      console.error('unable to create DataSource')
      return
    }
    console.log('DataSource: ', ds)
    ds.ready().then(() => {
      console.log('configQueryParams: ', ds.getConfigQueryParams())
      console.log('currentQueryParams: ', ds.getCurrentQueryParams())
      console.log('runtimeQueryParams: ', ds.getRuntimeQueryParams())
      // if (!queryParamsWatchHandle) {
      //   queryParamsWatchHandle = reactiveUtils.watch(
      //     ds.getCurrentQueryParams,
      //     (oldValue, newValue) => {
      //       console.log(oldValue, newValue)
      //     })
      // }
    })

    setDataSource(ds)
  }

  // runs once
  const activeViewChangeHandler = (jmv: JimuMapView) => {
    if (!jmv) {
      console.warn('no MapView')
      return
    }
    setView(jmv.view)

    // Replaced your code below with this
    // here we execute the callback when the stationary is true
    // no longer executing at the beginning multiple times for me
    // and it doesn't appear we need to switch to animation
    jmv.view.when(() => {
      reactiveUtils.when(() => jmv.view.stationary === true, () => {
        if (jmv.view.extent) {
          console.log("Extent changed");
        }
      })
    }, (error)=>{console.error(error)});

    // if (!extentWatchHandle) {
    //   extentWatchHandle = jmv.view.watch('extent', (newValue, oldValue) => {
    //     //TODO why does this happen?
    //     // NOTE
    //     // An alternative approach could be: https://developers.arcgis.com/javascript/latest/api-reference/esri-views-View.html#animation
    //     // watching the jmv.view.animation property https://developers.arcgis.com/javascript/latest/api-reference/esri-views-ViewAnimation.html
    //     // MapView.extent doc: https://developers.arcgis.com/javascript/latest/api-reference/esri-views-MapView.html#extent
    //     // in the check, shouldn't need to, but may need to && the extent param passed into the check needs to be of type Extent
    //     if (newValue.equals(oldValue)) {
    //       console.warn('new extent same as old extent')
    //       // new extent same as old extent, no action taken
    //       return
    //     }
    //     // TODO trigger some action
    //     console.log('Extent changed')
    //   })
    // }

    // alternative to watching DataSource queryParams property?
    // Within the framework, you can set the FeatureLayerQueryParams, then set the query prop on the DataSourceComponent (like in <sdk-samples-repo>/client\sdk-sample\widgets\feature-layer-function\src\runtime\widget.tsx)
    // There's also the JimuLayerView && JimuLayerViewComponent
    // syntax below would be something like: `reactiveUtils.watch(() => layer.definitionExpression, () => { console.log(`definition expression: ${definitionExpression}`); });
    if (!queryParamsWatchHandle) {
      const layer = jmv.view.map.layers.find(lyr => lyr.title === 'USA ZIP Code Points')
      queryParamsWatchHandle = layer.watch('definitionExpression', (newExpression, oldExpression) => {
        // TODO trigger some action
        console.log('layerDefinition changed')
      })
    }
  }

  // fires only once, when widget initially opened
  useEffect(() => {

  //   view.when(() => {
  //   reactiveUtils.when(() => view.stationary === true, () => {
  //     if (view.extent) {
  //       console.log("Extent changed");
  //     }
  //   })
  // })

    // one-time cleanup function
    return function cleanup () {
      // remove at time componment is destroyed
      if (extentWatchHandle) {
        extentWatchHandle.remove()
      }
      if (stationaryWatchHandle) {
        stationaryWatchHandle.remove()
      }
      if (queryParamsWatchHandle) {
        stationaryWatchHandle.remove()
      }
    }
  }, [])

  return (
    <div className="widget-demo jimu-widget m-2">
      <DataSourceComponent
        useDataSource={props.useDataSources?.[0]}
        widgetId={props.id}
        onDataSourceCreated={onDataSourceCreated}
      />
      <JimuMapViewComponent
        useMapWidgetId={props.useMapWidgetIds?.[0]}
        onActiveViewChange={activeViewChangeHandler}
      />
      {/* <p>isUpdating: {isUpdating}</p>
      <p>updateQueued: {updateQueued}</p> */}
      {/* {props.stateProps?.lastMessage && <p>lastMessage: {props.stateProps?.lastMessage}</p>} */}
    </div>
  )
}

interface ExtraProps {
  lastMessage: string|undefined
}

// called everytime any widget updates shared store?
// SubscriberDemo.mapExtraStateProps = (state: IMState, ownProps: AllWidgetProps<IMConfig>): ExtraProps => {
// console.log('inside mapExtraStateProps')
// let wId: string
// // will trigger for 'lastMessage' property in ANY widget
// for (const [key, value] of Object.entries(state.widgetsState)) {
//   if (value.lastMessage) {
//     wId = key
//     console.log(`widget ${key}: `, value)
//   }
// }
// if (wId) {
//   return { lastMessage: state.widgetsState[wId]?.lastMessage }
// } else {
//   return { lastMessage: '' }
// }
// }
