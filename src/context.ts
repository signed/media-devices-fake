import { NotImplemented, ThrowingNotImplemented } from './not-implemented'

export const defaultContext = (): Context => {
  return { notImplemented: new ThrowingNotImplemented() }
}

export interface Context {
  readonly notImplemented: NotImplemented
}
