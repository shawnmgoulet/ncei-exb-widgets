/** @jsx jsx */
import {
  AllWidgetProps,
  jsx,
  IMState,
  ReactRedux
} from 'jimu-core'
import webMercatorUtils from 'esri/geometry/support/webMercatorUtils'
import Extent from 'esri/geometry/Extent'
import { IMConfig } from '../config'
import defaultMessages from './translations/default'

const { useSelector } = ReactRedux

// since we cannot pass Extent object from MessageAction and cannot convert to
// geographic in MessageAction due to load error using webMercatorUtils
function convertAndFormatCoordinates (bboxString: string, dp: number = 5) {
  const [xmin, ymin, xmax, ymax] = bboxString.split(',').map(str => parseFloat(str))
  const extent = new Extent({ xmin: xmin, ymin: ymin, xmax: xmax, ymax: ymax, spatialReference: { wkid: 102100 } })
  const geoExtent = webMercatorUtils.webMercatorToGeographic(extent, false) as Extent
  return `${geoExtent.xmin.toFixed(dp)}, ${geoExtent.ymin.toFixed(dp)}, ${geoExtent.xmax.toFixed(dp)}, ${geoExtent.ymax.toFixed(dp)}`
}

export default function SubscriberDemo (props: AllWidgetProps<IMConfig>) {
  // console.log('props: ', props)

  // get state for this widget
  const widgetState = useSelector((state: IMState) => {
    return state.widgetsState[props.widgetId]
  })
  // console.log('widgetState', widgetState)

  return (
    <div>
      <p>Extent: {widgetState?.extent ? convertAndFormatCoordinates(widgetState.extent, 3) : ''}</p>
      <p>Filter: {widgetState?.queryParams ? widgetState.queryParams : 'none'}</p>
    </div>
  )
}
