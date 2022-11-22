import { AllWidgetProps, React, jimuHistory } from 'jimu-core'
import { Tooltip } from 'jimu-ui'
import { useRef } from 'react'
import { IMConfig } from '../config'
import defaultMessage from './translations/default'
import { CalciteButton, CalciteIcon, CalciteTooltip } from 'calcite-components'

export default function Widget (props: AllWidgetProps<IMConfig>) {
  const buttonRef = useRef()
  function onClickHandler (e: React.MouseEvent<HTMLElement>) {
    window.open(props.config.url, '_blank')
  }

  return (
    <>
    {/* <CalciteButton id="downloadButton" onClick={onClickHandler}><CalciteIcon id="buttonIcon" ref={buttonRef} icon="download" /></CalciteButton> */}
    <Tooltip title={props.config.tooltip}>
    <CalciteButton id="portalButton" ref={buttonRef} onClick={onClickHandler} iconEnd='sign-out'>{props.config.name}</CalciteButton>
    </Tooltip>
    </>
  )
}
