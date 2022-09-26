/** @jsx jsx */
import { React, jsx, DataSourceTypes, Immutable, UseDataSource, IMState, getAppStore, ReactRedux } from 'jimu-core'
import { AllWidgetSettingProps } from 'jimu-for-builder'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
import { SettingSection, SettingRow, MapWidgetSelector } from 'jimu-ui/advanced/setting-components'

import { Select, Option } from 'jimu-ui'
import defaultMessages from './translations/default'

const { useState, useEffect } = React
const { useSelector } = ReactRedux

export default function Setting (props: AllWidgetSettingProps<{}>) {
  const supportedTypes = Immutable([DataSourceTypes.FeatureLayer])

  const [sidebarWidgetId, setSidebarWidgetId] = useState(null as string)
  const [appWidgets, setAppWidgets] = useState({} as Object)
  const [sidebarWidgetsArray, setSidebarWidgetsArray] = useState([] as any[])

  // Get the widget state - because the sidebar state may change in the runtime, via Redux's useSelector hook
  const widgetState = useSelector((state: IMState) => {
    const widgetState = state.widgetsState[sidebarWidgetId]
    return widgetState
  })

  // Update the appWidgets property once, on page load
  useEffect(() => {
    const widgets = getAppStore().getState().appConfig.widgets
    setAppWidgets(widgets)
  }, [])

  // Update the widgetsArray and sidebarWidgetsArray properties every time appWidgets changes
  useEffect(() => {
    if (appWidgets) {
      const widgetsArray = Object.values(appWidgets)
      // TODO id values are different than when retrieved w/in the main widget body.
      console.log('sidebarWidgets: ', widgetsArray.filter(w => w.uri === 'widgets/layout/sidebar/'))
      setSidebarWidgetsArray(widgetsArray.filter(w => w.uri === 'widgets/layout/sidebar/'))
    }
  }, [appWidgets])

  const onDataSourceChange = (useDataSources: UseDataSource[]) => {
    props.onSettingChange({
      id: props.id,
      useDataSources: useDataSources
    })
  }

  const onMapSelected = (useMapWidgetIds: string[]) => {
    props.onSettingChange({
      id: props.id,
      useMapWidgetIds: useMapWidgetIds
    })
  }

  // Handler for the sidebar selection
  const handleSidebarSelect = evt => {
    console.log('set selected Sidebar widget: ', evt)
    setSidebarWidgetId(evt.currentTarget.value)
    props.onSettingChange({
      id: props.id,
      config: props.config.set('sidebarWidgetId', evt.currentTarget.value)
    })
  }

  return (
    <div className='toggle-sidebar-setting p-3'>
      <SettingSection title="DataSource to watch">
        <SettingRow>
          <DataSourceSelector
            mustUseDataSource
            types={supportedTypes}
            useDataSources={props.useDataSources}
            onChange={onDataSourceChange}
            widgetId={props.id}
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Map to watch">
        <SettingRow>
        <MapWidgetSelector onSelect={onMapSelected} useMapWidgetIds={props.useMapWidgetIds}/>
        </SettingRow>
      </SettingSection>

      <SettingSection title="Sidebar to Control">
        {sidebarWidgetsArray && sidebarWidgetsArray.length > 0 &&
          <SettingRow className='p-2 justify-content-between align-items-center'>
            <Select
              defaultValue=''
              onChange={handleSidebarSelect}
              placeholder={defaultMessages.sidebarPlaceholder}
              title={defaultMessages.sidebarPlaceholder}
            >
              { sidebarWidgetsArray.map((w) => <Option value={w.id}>{w.label}</Option>) }
            </Select>
          </SettingRow>
        }
      </SettingSection>
    </div>
  )
}
