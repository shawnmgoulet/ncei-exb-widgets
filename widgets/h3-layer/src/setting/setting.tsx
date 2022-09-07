/** @jsx jsx */
import { React, jsx } from 'jimu-core'
import { AllWidgetSettingProps } from 'jimu-for-builder'
// import {JimuMapViewSelector} from 'jimu-ui/advanced/setting-components'
import { MapWidgetSelector, SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components'
import { TextInput } from 'jimu-ui'
import { IMConfig } from '../config'

export default function Setting (props: AllWidgetSettingProps<IMConfig>) {
  const onMapSelected = (useMapWidgetIds: string[]) => {
    props.onSettingChange({
      id: props.id,
      useMapWidgetIds: useMapWidgetIds
    })
  }

  const onLayerNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    props.onSettingChange({
      id: props.id,
      config: props.config.set('layerName', event.target.value)
    })
  }

  return (
    <div className='widget-setting-demo p-3'>
    <SettingSection title="Map">
      <SettingRow>
        <MapWidgetSelector onSelect={onMapSelected} useMapWidgetIds={props.useMapWidgetIds}/>
      </SettingRow>
    </SettingSection>

    <SettingSection title="FeatureLayer Name">
      <SettingRow>
        <TextInput type="text" placeholder="layer name" htmlSize={28} value={props.config.layerName} onChange={onLayerNameChange}/>
      </SettingRow>
    </SettingSection>

  </div>
  )
}
