import {
  AbstractMessageAction,
  MessageType,
  Message,
  getAppStore,
  appActions,
  MessageDescription,
  DataSourceFilterChangeMessage,
  DataSourceManager,
  SqlQueryParams,
  QueriableDataSource
} from 'jimu-core'

export default class FilterChangeAction extends AbstractMessageAction {
  // new in v1.9, replaces filterMessageDescription. used in builder
  filterMessageDescription (messageDescription: MessageDescription): boolean {
    return messageDescription.messageType === MessageType.DataSourceFilterChange
  }

  filterMessage (message: Message): boolean {
    // support any Message type
    return message.type === MessageType.DataSourceFilterChange
  }

  //set action setting uri
  getSettingComponentUri (messageType: MessageType, messageWidgetId?: string): string {
    return 'actions/filter-change-action-setting'
  }

  onExecute (message: Message, actionConfig?: any): Promise<boolean> | boolean {
    switch (message.type) {
      case MessageType.DataSourceFilterChange:
        const dsFilterChangeMessage = message as DataSourceFilterChangeMessage
        // console.log('FilterChangeAction: got DataSourceFilterChangeMessage', message, actionConfig)
        const dataSource = DataSourceManager.getInstance().getDataSource(dsFilterChangeMessage.dataSourceId) as QueriableDataSource
        const queryParams: SqlQueryParams = dataSource.getCurrentQueryParams()
        getAppStore().dispatch(appActions.widgetStatePropChange(this.widgetId, 'queryParams', queryParams.where))
        break
    }
    return true
  }
}
