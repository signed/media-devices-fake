import { Context } from './context.js'
import { ThrowingNotImplemented } from './not-implemented.js'
import { NoopReporter } from './reporter.js'

export const anyContext = (): Context => {
  const reporter = new NoopReporter()
  return { notImplemented: new ThrowingNotImplemented(reporter), reporter: reporter }
}
