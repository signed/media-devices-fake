import './matchers/to-be-uuid.js'
import { anyContext } from './ContextMother.js'
import { allAccessGranted, anyDevice, forgeMediaDevices } from './index.js'
import { MediaDeviceInfoFake } from './MediaDeviceInfoFake.js'
import { initialMediaStreamTrackProperties, MediaStreamTrackFake } from './MediaStreamTrackFake.js'
import { anyTrackKind } from './MediaStreamTrackMother.js'

describe('MediaStreamTrackFake', () => {
  let track: MediaStreamTrackFake

  beforeEach(() => {
    const deviceDescription = anyDevice({ label: 'The Label' })
    const context = anyContext()
    const device = new MediaDeviceInfoFake(context, deviceDescription)
    track = new MediaStreamTrackFake(context, initialMediaStreamTrackProperties(device, anyTrackKind(), {}))
  })

  test('enabled by default', () => {
    expect(track.enabled).toBe(true)
  })

  test('unmute by default', () => {
    expect(track.muted).toBe(false)
  })

  test('id is a uuid', () => {
    expect(track.id).toBeUuid()
  })

  test('can be paused', () => {
    track.enabled = false
    expect(track.enabled).toBe(false)
  })

  test('live by default', () => {
    expect(track.readyState).toBe('live')
  })

  test('ended after stop', () => {
    track.stop()
    expect(track.readyState).toBe('ended')
  })

  // https://stackoverflow.com/questions/55953038/why-is-the-ended-event-not-firing-for-this-mediastreamtrack/55960232#55960232
  // https://w3c.github.io/mediacapture-main/getusermedia.html#dom-mediastreamtrack-stop
  test('onEnded is not called after stop', () => {
    const onEnded = jest.fn()
    const onEndedListener = jest.fn()
    track.onended = onEnded
    track.addEventListener('ended', onEndedListener)
    track.stop()
    expect(onEnded).not.toHaveBeenCalled()
    expect(onEndedListener).not.toHaveBeenCalled()
  })

  // https://w3c.github.io/mediacapture-main/getusermedia.html#event-mediastreamtrack-ended
  describe('is called', () => {
    test('when the device is removed', async () => {
      const device = anyDevice({ kind: 'audioinput' })
      const control = forgeMediaDevices({ attachedDevices: [device], ...allAccessGranted() })

      const mediaStream = await control.mediaDevices.getUserMedia({ audio: true })
      const audioTracks = mediaStream.getAudioTracks()
      const track = audioTracks[0]

      const onEnded = jest.fn()
      const onEndedListener = jest.fn(() => {
        expect(track.readyState).toBe('ended')
      })
      const removedOnEndedListener = jest.fn()
      track.onended = onEnded
      track.addEventListener('ended', onEndedListener)
      track.addEventListener('ended', removedOnEndedListener)
      track.removeEventListener('ended', removedOnEndedListener)

      control.remove(device)

      expect(track.readyState).toBe('ended')
      expect(removedOnEndedListener).not.toHaveBeenCalled()
      expect(onEnded).toHaveBeenCalled()
      expect(onEndedListener).toHaveBeenCalled()
    })
    test('when the device permission is revoked', async () => {
      const device = anyDevice({ kind: 'audioinput' })
      const control = forgeMediaDevices({ attachedDevices: [device], ...allAccessGranted() })

      const mediaStream = await control.mediaDevices.getUserMedia({ audio: true })
      const audioTracks = mediaStream.getAudioTracks()
      const track = audioTracks[0]

      const onEnded = jest.fn()
      const onEndedListener = jest.fn(() => {
        expect(track.readyState).toBe('ended')
      })

      track.onended = onEnded
      track.addEventListener('ended', onEndedListener)

      control.setPermissionFor('microphone', 'prompt')

      expect(track.readyState).toBe('ended')
      expect(onEnded).toHaveBeenCalled()
      expect(onEndedListener).toHaveBeenCalled()

      const notCalledA2ndTime = jest.fn()
      track.onended = notCalledA2ndTime

      control.setPermissionFor('microphone', 'denied')
      expect(notCalledA2ndTime).not.toHaveBeenCalled()
    })
  })

  test('return the label', () => {
    expect(track.label).toBe('The Label')
  })
})
