export interface Reporter {
  notImplemented(message: string): void

  report(producer: () => string[]): void
}

export class NoopReporter implements Reporter {
  notImplemented(_message: string): void {
    // do nothing
  }

  report(_producer: () => string[]): void {
    // do nothing
  }
}

export class DefaultReporter implements Reporter {
  notImplemented(message: string): void {
    console.log('mdf', '💥', message)
  }

  report(producer: () => string[]): void {
    const parts = producer()
    console.log('mdf', ...parts)
  }
}
