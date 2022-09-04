import {
  React,
  utils,
  AllWidgetProps,
  // DataSourceComponent,
  // DataSourceStatus,
  // IMDataSourceInfo,
  // DataSource,
  // QueriableDataSource
} from 'jimu-core'
// import reactiveUtils from 'esri/core/reactiveUtils'

export default class Widget extends React.PureComponent<AllWidgetProps<unknown>, { extent: string, queryParams: string }> {
  state = { extent: null, queryParams: null }

  componentDidUpdate (prevProps: AllWidgetProps<unknown>) {
    // console.log('inside componentDidUpdate...')
    if (utils.getValue(this.props, 'stateProps.extent') !== utils.getValue(prevProps, 'stateProps.extent')) {
      const extent = utils.getValue(this.props, 'stateProps.extent')
      console.log(extent)
      this.setState({ extent: extent })
    }

    if (utils.getValue(this.props, 'stateProps.queryParams') !== utils.getValue(prevProps, 'stateProps.queryParams')) {
      const queryParams = utils.getValue(this.props, 'stateProps.queryParams')
      console.log('queryParams from DataSourceFilterChangeMessage: ', queryParams)
      this.setState({ queryParams: queryParams })
    }

    // const myDs = this.props.useDataSources[0]
  }

  componentDidMount () {
    // console.log('inside componentDidMount with ', this.props.stateProps?.extent)
  }

  // isDsConfigured = () => {
  //   if (this.props.useDataSources && this.props.useDataSources.length === 1) {
  //     return true
  //   }
  //   return false
  // }

  render () {
    // console.log('rendering...')
    // console.log('props: ', this.props)
    return <div className="widget-subscribe" style={{ overflow: 'auto', maxHeight: '700px' }}>
        <p>Extent: {this.state.extent}</p>
        <p>Filter: {this.state.queryParams}</p>

        {/* <DataSourceComponent useDataSource={this.props.useDataSources[0]} widgetId={this.props.id} localId="query-result">
        {
          (ds: QueriableDataSource, info: IMDataSourceInfo) => {
            const isLoaded = info.status === DataSourceStatus.Loaded
            let content
            if (!this.props.stateProps) {
              content = 'no message'
            } else {
              content = <div>
                <div>query state: {info.status}</div>
                <div>isDsConfigured: {this.isDsConfigured().toString()}</div>
              </div>
            }
            return content
          }
      }
      </DataSourceComponent> */}
    </div>
  }
}
