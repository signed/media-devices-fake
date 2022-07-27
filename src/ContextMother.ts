import { Context } from './context'
import { ThrowingNotImplemented } from './not-implemented'
import { NoopReporter } from './reporter'

export const anyContext = (): Context => {
  const reporter = new NoopReporter()
  return { notImplemented: new ThrowingNotImplemented(reporter), reporter: reporter }
}
