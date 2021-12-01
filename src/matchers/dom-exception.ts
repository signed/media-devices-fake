export {}

declare global {
  namespace jest {
    interface Matchers<R> {
      domException(message?: string, name?: string): CustomMatcherResult
    }
  }
}

expect.extend({
  domException(received: DOMException, msg: string = '', name: string = 'Error'): jest.CustomMatcherResult {
    const constructor = Object.getPrototypeOf(received).constructor.name
    const passType = received instanceof DOMException
    const passMessage = received.message === msg
    const passName = received.name === name
    const pass: boolean = passType && passMessage && passName
    const expected = this.utils.printExpected(`new DOMException('${msg}', '${name}')`)
    const actual = this.utils.printReceived(`new ${constructor}('${received.message}', '${received.name}')`)
    const message: () => string = () => (pass ? '' : `expected ${expected}\n but was ${actual}')`)
    return {
      message,
      pass,
    }
  },
})
