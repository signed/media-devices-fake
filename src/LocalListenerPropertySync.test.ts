import { LocalListenerPropertySync } from './LocalListenerPropertySync'

let target: EventTarget
let sync: LocalListenerPropertySync<EventListener>
const type = 'devicechange'

beforeEach(() => {
  target = new EventTarget()
  sync = new LocalListenerPropertySync(target, type)
})

test('can cope with initially setting null', () => {
  sync.set(null)
  const listener = jest.fn()
  sync.set(listener)
  const event = dispatchMatchingEvent()
  expect(listener).toHaveBeenCalledWith(event)
})

test('add listener to event target', () => {
  const listener = jest.fn()
  sync.set(listener)
  const event = dispatchMatchingEvent()
  expect(listener).toHaveBeenCalledWith(event)
})

test('remove listener from target if set to null', () => {
  const listener = jest.fn()
  sync.set(listener)
  sync.set(null)
  dispatchMatchingEvent()
  expect(listener).not.toHaveBeenCalled()
})

test('only inform the last set listener', () => {
  const _1st = jest.fn()
  const _2nd = jest.fn()
  sync.set(_1st)
  sync.set(_2nd)
  dispatchMatchingEvent()
  expect(_1st).not.toHaveBeenCalled()
  expect(_2nd).toHaveBeenCalled()
})

const dispatchMatchingEvent = () => {
  const event = matchingEvent()
  target.dispatchEvent(event)
  return event
}

const matchingEvent = () => new Event(type)
