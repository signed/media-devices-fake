import { Reporter } from './reporter'

export interface NotImplemented {
  call(message: string): never
}

export class ThrowingNotImplemented implements NotImplemented {
  constructor(private readonly _reporter: Reporter) {}

  call(message: string): never {
    this._reporter.notImplemented(message)
    throw new Error(message)
  }
}
