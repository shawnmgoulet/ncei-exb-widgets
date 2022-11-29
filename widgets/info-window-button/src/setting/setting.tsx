/** @jsx jsx */
import { React, jsx } from 'jimu-core'
import { AllWidgetSettingProps } from 'jimu-for-builder'
import { SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components'
import { TextInput } from 'jimu-ui'
import { IMConfig } from '../config'

export default function Setting (props: AllWidgetSettingProps<IMConfig>) {
  const onDialogIdChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    props.onSettingChange({
      id: props.id,
      config: props.config.set('dialogId', evt.target.value)
    })
  }

  return (
    <div className='widget-setting-demo p-3'>
    <SettingSection title="DialogId">
      <SettingRow>
        <TextInput id="dialogIdInput" type="text" placeholder="dialogId" value={props.config.dialogId} htmlSize={28} onChange={onDialogIdChange}/>
      </SettingRow>
    </SettingSection>
  </div>
  )
}
