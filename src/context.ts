import { NotImplemented, ThrowingNotImplemented } from './not-implemented'
import { DefaultReporter, Reporter } from './reporter'

export const defaultContext = (): Context => {
  const repoter = new DefaultReporter()
  return { notImplemented: new ThrowingNotImplemented(repoter), reporter: repoter }
}

export interface Context {
  readonly notImplemented: NotImplemented
  readonly reporter: Reporter
}
