import { ImmutableObject } from 'jimu-core'

export interface Config{
  url: string
  name: string
  tooltip: string
}

export type IMConfig = ImmutableObject<Config>
