/** @jsx jsx */
import { React, jsx, Immutable, DataSourceTypes, UseDataSource } from 'jimu-core'
import { AllWidgetSettingProps } from 'jimu-for-builder'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
import { MapWidgetSelector, SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components'
import { IMConfig } from '../config'

export default function Setting (props: AllWidgetSettingProps<IMConfig>) {
  const supportedTypes = Immutable([DataSourceTypes.FeatureLayer])

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

  return (
    <div className='filtered-record-count p-3'>
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
    </div>
  )
}
