import {
  AbstractMessageAction,
  MessageType,
  Message,
  getAppStore,
  appActions,
  DataSourceFilterChangeMessage,
  ExtentChangeMessage,
  DataSourceManager,
  QueriableDataSource,
  SqlQueryParams,
  MessageDescription
} from 'jimu-core'

export default class FilterAction extends AbstractMessageAction {
  filterMessageDescription (messageDescription: MessageDescription): boolean {
    return (
      messageDescription.messageType === 'DATA_SOURCE_FILTER_CHANGE' ||
      messageDescription.messageType === 'EXTENT_CHANGE'
    )
  }

  // replaced by filterMessageDescription in v1.9
  // filterMessageType (messageType: MessageType, messageWidgetId?: string): boolean {
  //   return [MessageType.DataSourceFilterChange].includes(messageType)
  // }

  filterMessage (message: Message): boolean {
    return true
  }

  //set action setting uri
  getSettingComponentUri (messageType: MessageType, messageWidgetId?: string): string {
    return 'actions/filter-change-action-setting'
  }

  onExecute (message: Message, actionConfig?: any): Promise<boolean> | boolean {
    switch (message.type) {
      case MessageType.DataSourceFilterChange:
        const dsFilterChangeMessage = message as DataSourceFilterChangeMessage
        // console.log('erddap-query: filter-change-action. got DataSourceFilterChangeMessage', dsFilterChangeMessage, actionConfig)
        const ds = DataSourceManager.getInstance().getDataSource(dsFilterChangeMessage.dataSourceId) as QueriableDataSource
        const queryParams: SqlQueryParams = ds.getCurrentQueryParams()
        getAppStore().dispatch(appActions.widgetStatePropChange(this.widgetId, 'queryString', queryParams.where))
        break

      case MessageType.ExtentChange:
        // console.log('MessageHandlerAction: got ExtentChangeMessage', message, actionConfig)
        const extentChangeMessage = message as ExtentChangeMessage
        // trigger an update for the widget when Extent is different from previous.
        // Must be a plain JavaScript Object (see https://developers.arcgis.com/experience-builder/guide/widget-communication/)
        // console.log('inside actionHandler. spatialReference: ', extentChangeMessage.extent.spatialReference)
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
    }

    return true
  }
}
