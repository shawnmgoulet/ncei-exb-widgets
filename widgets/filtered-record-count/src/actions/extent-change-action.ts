import {
  AbstractMessageAction,
  MessageType,
  Message,
  getAppStore,
  appActions,
  MessageDescription,
  ExtentChangeMessage
} from 'jimu-core'
import Extent from 'esri/geometry/Extent'
import webMercatorUtils from 'esri/geometry/support/webMercatorUtils'

export default class ExtentChangeAction extends AbstractMessageAction {
  // new in v1.9, replaces filterMessageDescription. used in builder
  filterMessageDescription (messageDescription: MessageDescription): boolean {
    return messageDescription.messageType === MessageType.ExtentChange
  }

  filterMessage (message: Message): boolean {
    return message.type === MessageType.ExtentChange
  }

  //set action setting uri
  getSettingComponentUri (messageType: MessageType, messageWidgetId?: string): string {
    return 'actions/extent-change-action-setting'
  }

  onExecute (message: Message, actionConfig?: any): Promise<boolean> | boolean {
    switch (message.type) {
      case MessageType.ExtentChange:
        // console.log('ExtentChangeAction: got ExtentChangeMessage', message, actionConfig)
        const extentChangeMessage = message as ExtentChangeMessage
        // trigger an update for the widget when Extent is different from previous. Must be a plain JavaScript Object (see https://developers.arcgis.com/experience-builder/guide/widget-communication/)
        // getAppStore().dispatch(appActions.widgetStatePropChange(this.widgetId, 'extent', this.formatExtent(extentChangeMessage.extent)))

        // getAppStore().dispatch(appActions.widgetStatePropChange(
        //   this.widgetId,
        //   'extent',
        //   {
        //     xmin: extentChangeMessage.extent.xmin,
        //     ymin: extentChangeMessage.extent.ymin,
        //     xmax: extentChangeMessage.extent.xmax,
        //     ymax: extentChangeMessage.extent.ymax
        //   })
        // )
        break
    }

    return true
  }

  formatExtent (extent: Extent): string {
    if (!extent) { return 'extent not available' }
    // VSCode does not recognize isLinear argument is optional and defaults to false
    // TODO calling webMercatorToGeographic() causing "Load module error. TypeError: window.require is not a function"
    // const geoExtent = webMercatorUtils.webMercatorToGeographic(extent, false) as Extent
    // return `${geoExtent.xmin}, ${geoExtent.ymin}, ${geoExtent.xmax}, ${geoExtent.ymax}`
    return `${extent.xmin}, ${extent.ymin}, ${extent.xmax}, ${extent.ymax}`
  }
}
