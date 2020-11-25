export {}

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeUuid(): CustomMatcherResult
    }
  }
}

expect.extend({
  toBeUuid(received: string): jest.CustomMatcherResult {
    const pass: boolean = /([a-f0-9]{8}(-[a-f0-9]{4}){4}[a-f0-9]{8})/.test(received)
    const actual = this.utils.printReceived(received)
    const expected = this.utils.printExpected('xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx')
    const message: () => string = () => (pass ? '' : `${actual} is not a uuid ${expected}`)
    return {
      message,
      pass,
    }
  },
})
