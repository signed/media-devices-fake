import { NotImplemented, ThrowingNotImplemented } from './not-implemented'
import { DefaultReporter, Reporter } from './reporter'

export const defaultContext = (): Context => {
  const reporter = new DefaultReporter()
  return { notImplemented: new ThrowingNotImplemented(reporter), reporter: reporter }
}

export interface Context {
  readonly notImplemented: NotImplemented
  readonly reporter: Reporter
}
