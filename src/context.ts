import { NotImplemented } from './not-implemented.js'
import { Reporter } from './reporter.js'

export interface Context {
  readonly notImplemented: NotImplemented
  readonly reporter: Reporter
}
