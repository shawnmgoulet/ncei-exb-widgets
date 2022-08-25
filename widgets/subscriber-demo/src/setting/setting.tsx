/** @jsx jsx */
import { React, jsx, Immutable, DataSourceTypes, UseDataSource } from 'jimu-core'
import { AllWidgetSettingProps } from 'jimu-for-builder'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
// import {JimuMapViewSelector} from 'jimu-ui/advanced/setting-components'
import { MapWidgetSelector, SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components'
import { TextInput } from 'jimu-ui'
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

  // TODO why isn't this saved in configuration?
  // set the featureServiceUrl prop to the evt's target.value
  const onServiceUrlChange = (evt: any) => {
    console.log('inside onServiceUrlChange with ', evt.target.value)
    props.onSettingChange({
      id: props.id,
      config: props.config.set('featureServiceUrl', evt.target.value)
    })
  }

  return (
    <div className='widget-setting-demo p-3'>
    <SettingSection title="DataSource to filter">
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

    <SettingSection title="FeatureService URL">
      <SettingRow>
        // Shawn: onChange is available to us because the TextinputProps within text-input.d.ts extends upon InputProps
        // which extends React.InputHTMLAttributes Interface, which includes the onChange method, returning the evt
        <TextInput id="featureServiceUrlInput" type="url" placeholder="service url" value={props.config.featureServiceUrl} htmlSize={28} onChange={onServiceUrlChange}/>
      </SettingRow>
    </SettingSection>

  </div>
  )
}
