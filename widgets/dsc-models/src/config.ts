import { ImmutableObject } from 'seamless-immutable'

export interface Config {
  modelsLayerName: string
}

export type IMConfig = ImmutableObject<Config>
