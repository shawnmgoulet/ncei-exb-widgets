/** @jsx jsx */
import { React, jsx } from 'jimu-core'
import { AllWidgetSettingProps } from 'jimu-for-builder'
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

  const onLayerNameChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    props.onSettingChange({
      id: props.id,
      config: props.config.set('modelsLayerName', evt.target.value)
    })
  }
  
  return (
    <div className='widget-setting-demo p-3'>
    <SettingSection title="Map to watch">
      <SettingRow>
        <MapWidgetSelector onSelect={onMapSelected} useMapWidgetIds={props.useMapWidgetIds}/>
      </SettingRow>
    </SettingSection>
    <SettingSection title="LayerName">
      <SettingRow>
        <TextInput id="layerNameInput" type="text" placeholder="models layer name" value={props.config.modelsLayerName} htmlSize={28} onChange={onLayerNameChange}/>
      </SettingRow>
    </SettingSection>
  </div>
  )
}
