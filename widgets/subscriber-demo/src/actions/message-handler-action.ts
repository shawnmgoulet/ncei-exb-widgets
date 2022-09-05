import {
  AbstractMessageAction,
  MessageType,
  Message,
  getAppStore,
  appActions,
  MessageDescription,
  ExtentChangeMessage,
  DataSourceFilterChangeMessage,
  LocationChangeMessage,
  DataRecordsSelectionChangeMessage,
  DataRecordSetChangeMessage,
  DataSourceManager,
  DataSource,
  SqlQueryParams,
  QueriableDataSource
} from 'jimu-core'
import Extent from 'esri/geometry/Extent'
import webMercatorUtils from 'esri/geometry/support/webMercatorUtils'

export default class MessageHandlerAction extends AbstractMessageAction {
  // new in v1.9, replaces filterMessageDescription. used in builder
  filterMessageDescription (messageDescription: MessageDescription): boolean {
    // support any Message type
    return true
  }

  filterMessage (message: Message): boolean {
    // support any Message type
    return true
  }

  //set action setting uri
  getSettingComponentUri (messageType: MessageType, messageWidgetId?: string): string {
    return 'actions/message-handler-action-setting'
  }

  onExecute (message: Message, actionConfig?: any): Promise<boolean> | boolean {
    switch (message.type) {
      case MessageType.DataSourceFilterChange:
        const dsFilterChangeMessage = message as DataSourceFilterChangeMessage
        console.log('MessageHandlerAction: got DataSourceFilterChangeMessage', message, actionConfig)
        const dataSource = DataSourceManager.getInstance().getDataSource(dsFilterChangeMessage.dataSourceId) as QueriableDataSource
        const queryParams: SqlQueryParams = dataSource.getCurrentQueryParams()
        getAppStore().dispatch(appActions.widgetStatePropChange(this.widgetId, 'queryParams', queryParams.where))
        break

      case MessageType.ExtentChange:
        console.log('MessageHandlerAction: got ExtentChangeMessage', message, actionConfig)
        const extentChangeMessage = message as ExtentChangeMessage
        // trigger an update for the widget when Extent is different from previous. Must be a plain JavaScript Object (see https://developers.arcgis.com/experience-builder/guide/widget-communication/)
        // getAppStore().dispatch(appActions.widgetStatePropChange(this.widgetId, 'extent', this.formatExtent(extentChangeMessage.extent)))
        getAppStore().dispatch(appActions.widgetStatePropChange(
          this.widgetId,
          'extent',
          {
            xmin: extentChangeMessage.extent.xmin,
            ymin: extentChangeMessage.extent.ymin,
            xmax: extentChangeMessage.extent.xmax,
            ymax: extentChangeMessage.extent.ymax
          })
        )
        break

      case MessageType.DataRecordSetChange:
        console.log('MessageHandlerAction: got DataRecordSetChangeMessage', message, actionConfig)
        const dataRecordSetChangeMessage = message as DataRecordSetChangeMessage
        break

      case MessageType.DataRecordsSelectionChange:
        console.log('MessageHandlerAction: got DataRecordsSelectionChangeMessage', message, actionConfig)
        const dataRecordsChangeMessage = message as DataRecordsSelectionChangeMessage
        break

      // TODO how to configure Map to issue LocationChangeMessage?
      case MessageType.LocationChange:
        console.log('MessageHandlerAction: got LocationChangeMessage', message, actionConfig)
        const LocationChangeMessage = message as LocationChangeMessage
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
