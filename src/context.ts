import type { NotImplemented } from './not-implemented.js'
import type { Reporter } from './reporter.js'

export interface Context {
  readonly notImplemented: NotImplemented
  readonly reporter: Reporter
}
