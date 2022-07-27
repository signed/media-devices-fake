import { NotImplemented } from './not-implemented'
import { Reporter } from './reporter'

export interface Context {
  readonly notImplemented: NotImplemented
  readonly reporter: Reporter
}
