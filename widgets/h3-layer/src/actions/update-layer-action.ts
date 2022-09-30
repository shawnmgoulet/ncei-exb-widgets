import {
  AbstractMessageAction,
  MessageType,
  Message,
  getAppStore,
  appActions,
  MessageDescription,
  ExtentChangeMessage,
  DataSourceFilterChangeMessage,
  DataRecordsSelectionChangeMessage,
  DataSourceManager,
  SqlQueryParams,
  QueriableDataSource
} from 'jimu-core'

export default class UpdateLayerAction extends AbstractMessageAction {
  filterMessageDescription (messageDescription: MessageDescription): boolean {
    // TODO limit to DataSourceFilterChangeMessage, ExtentChangeMessage, DataRecordsSelectionChange
    return true
  }

  filterMessage (message: Message): boolean {
    // TODO limit to DataSourceFilterChangeMessage, ExtentChangeMessage, DataRecordsSelectionChange
    return true
  }

  //set action setting uri
  getSettingComponentUri (messageType: MessageType, messageWidgetId?: string): string {
    return 'actions/update-layer-action-setting'
  }

  onExecute (message: Message, actionConfig?: any): Promise<boolean> | boolean {
    switch (message.type) {
      case MessageType.DataSourceFilterChange:
        const dsFilterChangeMessage = message as DataSourceFilterChangeMessage
        // console.log('MessageHandlerAction: got DataSourceFilterChangeMessage', message, actionConfig)

        // construct DataSource and get the query parameters
        const dataSource = DataSourceManager.getInstance().getDataSource(dsFilterChangeMessage.dataSourceId) as QueriableDataSource
        const queryParams: SqlQueryParams = dataSource.getCurrentQueryParams()
        getAppStore().dispatch(appActions.widgetStatePropChange(this.widgetId, 'queryParams', queryParams.where))
        break

      case MessageType.ExtentChange:
        // console.log('MessageHandlerAction: got ExtentChangeMessage', message, actionConfig)
        const extentChangeMessage = message as ExtentChangeMessage
        //
        // until we start drawing tiles just for the current view extent, no need to update and trigger a re-render
        //
        // trigger an update for the widget when Extent is different from previous.
        // Must be a plain JavaScript Object (see https://developers.arcgis.com/experience-builder/guide/widget-communication/)
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
      // TODO may be able to use this message to identify the selected polygon
      // but currently return empty array for selected feature on client-side layer
      case MessageType.DataRecordsSelectionChange:
        // console.log('MessageHandlerAction: got DataRecordsSelectionChangeMessage', message, actionConfig)
        const dataRecordsChangeMessage = message as DataRecordsSelectionChangeMessage
        break
    }

    return true
  }
}
