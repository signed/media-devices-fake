export type MediaStreamCheckResult = { success: boolean; messages?: Array<string> }
type MediaStreamPredicate = (mediaStream: MediaStream) => MediaStreamCheckResult
type ErrorPredicate = (error: Error) => MediaStreamCheckResult
type MediaStreamPromisePredicate = (mediaStream: Promise<MediaStream>) => Promise<MediaStreamCheckResult>

const mediaStream: (input: MediaStreamPredicate) => MediaStreamPromisePredicate = (input: MediaStreamPredicate) => {
  return async (promise: Promise<MediaStream>) => input(await promise)
}
const error: (input: ErrorPredicate) => MediaStreamPromisePredicate = (input: ErrorPredicate) => {
  return async (promise: Promise<MediaStream>) => {
    try {
      await promise
      return { success: false, messages: ['expected a rejected promise'] }
    } catch (e: any) {
      return input(e)
    }
  }
}

type MediaStreamCheck = {
  what: string
  predicate: MediaStreamPromisePredicate
}

interface Expected {
  description: string
  checks: MediaStreamCheck[]
}

type Matrix = Record<PermissionState, Expected | undefined>

export interface Scenario {
  summary: string
  description: string
  constraints?: MediaStreamConstraints
  expected: Matrix
}

export const passUndefined: Scenario = {
  summary: 'undefined constraints',
  description: 'pass undefined as constraints',
  constraints: undefined,
  expected: {
    prompt: undefined,
    denied: undefined,
    granted: {
      description: 'reject and communicate that at least one constrain has to be present',
      checks: [
        {
          what: 'TypeError',
          predicate: error((err) => {
            const success = err instanceof TypeError
            const messages = [`got: ${err.toString()}`]
            return { success, messages }
          }),
        },
        {
          what: 'error message',
          predicate: error((err) => {
            const expected = `Failed to execute 'getUserMedia' on 'MediaDevices': At least one of audio and video must be requested`
            const success = err.message === expected
            const messages = [`expected: ${expected}`, `got: '${err.message}'`]
            return { success, messages }
          }),
        },
      ],
    },
  },
}

export const requestedDeviceTypeNotAttached: Scenario = {
  summary: 'requested device type not attached',
  description: 'Requesting a camera but none is attached',
  constraints: { video: true },
  expected: {
    prompt: undefined,
    denied: undefined,
    granted: {
      description: 'reject and communicate that the requested device was not found',
      checks: [
        {
          what: 'DOMException',
          predicate: error((err) => {
            const success = err instanceof DOMException
            const messages = [`got: ${err.toString()}`]
            return { success, messages }
          }),
        },
        {
          what: 'error message',
          predicate: error((err) => {
            const expected = `Requested device not found`
            const success = err.message === expected
            const messages = [`expected: ${expected}`, `got: '${err.message}'`]
            return { success, messages }
          }),
        },
      ],
    },
  },
}

export const allConstraintsFalse: Scenario = {
  summary: 'all constraints false',
  description: 'pass false to the video and audio constraint',
  constraints: {
    audio: false,
    video: false,
  },
  expected: {
    prompt: undefined,
    denied: undefined,
    granted: {
      description: 'reject and communicate that at least one constrain has to be set to true',
      checks: [
        {
          what: 'TypeError',
          predicate: error((err) => {
            const success = err instanceof TypeError
            const messages = [`got: ${err.toString()}`]
            return { success, messages }
          }),
        },
        {
          what: 'error message',
          predicate: error((err) => {
            const expected = `Failed to execute 'getUserMedia' on 'MediaDevices': At least one of audio and video must be requested`
            const success = err.message === expected
            const messages = [`expected: ${expected}`, `got: '${err.message}'`]
            return { success, messages }
          }),
        },
      ],
    },
  },
}

export const noDeviceWithDeviceId: Scenario = {
  summary: 'bogus device id',
  description: 'the constraint contains a deviceId that no device has',
  constraints: { video: { deviceId: 'bogus' } },
  expected: {
    prompt: undefined,
    denied: undefined,
    granted: {
      description: 'fallback to any other audio device',
      checks: [
        {
          what: 'stream is active',
          predicate: mediaStream((stream) => {
            const success = stream.active
            return { success }
          }),
        },
        {
          what: 'stream has an id',
          predicate: mediaStream((stream) => {
            const success = stream.id.length > 0
            return { success }
          }),
        },
      ],
    },
  },
}

export const existingDevice: Scenario = {
  summary: 'existing device',
  description: 'any camera device without any other constraints',
  constraints: { video: true },
  expected: {
    prompt: undefined,
    denied: {
      description: 'should be rejected',
      checks: [
        {
          what: 'DOMException',
          predicate: error((error) => {
            const success = error instanceof DOMException
            const messages = [`got: ${error.constructor.name}`]
            return { success, messages }
          }),
        },
        {
          what: 'NotAllowedError',
          predicate: error((error) => {
            const actual = error.name
            const success = actual === 'NotAllowedError'
            const messages = [`got: ${actual}`]
            return { success, messages }
          }),
        },
      ],
    },
    granted: {
      description: 'tbd',
      checks: [],
    },
  },
}

const collectScenarios = () => {
  const result = new Map<string, Scenario>()
  result.set(existingDevice.summary, existingDevice)
  result.set(noDeviceWithDeviceId.summary, noDeviceWithDeviceId)
  result.set(passUndefined.summary, passUndefined)
  result.set(allConstraintsFalse.summary, allConstraintsFalse)
  result.set(requestedDeviceTypeNotAttached.summary, requestedDeviceTypeNotAttached)
  return result
}

export const scenarios = collectScenarios()
