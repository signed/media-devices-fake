export interface NotImplemented {
  call(message: string): never
}

export class ThrowingNotImplemented implements NotImplemented {
  call(message: string): never {
    throw new Error(message ?? 'not implemented')
  }
}
