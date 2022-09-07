import { ImmutableObject } from 'seamless-immutable'

export interface Config {
  layerName: string
}

export type IMConfig = ImmutableObject<Config>
