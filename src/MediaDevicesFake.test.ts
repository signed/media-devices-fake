import 'jest-extended'
import { anyContext } from './ContextMother'
import { anyCamera, anyDevice, anyMicrophone, anySpeaker } from './DeviceMother'
import './matchers/dom-exception'
import './matchers/to-be-uuid'
import './matchers/to-include-video-track'
import { MediaDevicesFake } from './MediaDevicesFake'
import { OpenMediaTracks } from './OpenMediaTracks'
import {
  allConstraintsFalse,
  noDeviceWithDeviceId,
  passUndefined,
  requestedDeviceTypeNotAttached,
  Scenario,
} from './Scenarios'
import { UserConsent, UserConsentTracker } from './UserConsentTracker'

describe('attach device', () => {
  let fake: MediaDevicesFake
  beforeEach(() => {
    fake = new MediaDevicesFake(anyContext(), allPermissionsGranted(), new OpenMediaTracks())
  })

  describe('attach', () => {
    test('inform the listeners', () => {
      const ondevicechange = jest.fn()
      const eventListener = jest.fn()

      fake.ondevicechange = ondevicechange
      fake.addEventListener('devicechange', eventListener)
      fake.attach(anyDevice())
      expect(ondevicechange).toHaveBeenCalled()
      expect(eventListener).toHaveBeenCalled()
    })
    test('no longer inform removed listeners', () => {
      const ondevicechange = jest.fn()
      const eventListener = jest.fn()

      fake.ondevicechange = ondevicechange
      fake.addEventListener('devicechange', eventListener)

      fake.ondevicechange = null
      fake.removeEventListener('devicechange', eventListener)

      fake.attach(anyDevice())
      expect(ondevicechange).not.toHaveBeenCalled()
      expect(eventListener).not.toHaveBeenCalled()
    })
    test('enumerate devices lists attached device', () => {
      const device = anyDevice({
        kind: 'audioinput',
        label: 'device label',
        groupId: 'the group id',
        deviceId: 'the device id',
      })
      fake.attach(device)
      return fake.enumerateDevices().then((devices) => {
        expect(devices).toHaveLength(1)
        const deviceInfo = devices[0]
        expect(deviceInfo.kind).toBe('audioinput')
        expect(deviceInfo.label).toBe('device label')
        expect(deviceInfo.groupId).toBe('the group id')
        expect(deviceInfo.deviceId).toBe('the device id')
      })
    })
    test('rejects adding two devices of the same kind with the same groupId:deviceId', () => {
      const one = anyDevice({ groupId: 'group id', deviceId: 'device id', kind: 'audioinput' })
      const two = anyDevice({ groupId: 'group id', deviceId: 'device id', kind: 'audioinput' })
      fake.attach(one)
      expect(() => fake.attach(two)).toThrow()
    })
    test('can attach devices with same groupId:deviceId if they are of a different kind', async () => {
      const one = anyDevice({ groupId: 'group id', deviceId: 'default', kind: 'audioinput' })
      const two = anyDevice({ groupId: 'group id', deviceId: 'default', kind: 'videoinput' })
      fake.attach(one)
      fake.attach(two)
      expect(await fake.enumerateDevices()).toHaveLength(2)
    })
  })

  describe('remove', () => {
    test('inform the listeners', () => {
      const ondevicechange = jest.fn()
      const eventListener = jest.fn()

      const device = anyDevice()
      fake.attach(device)
      fake.ondevicechange = ondevicechange
      fake.addEventListener('devicechange', eventListener)

      fake.remove(device)

      expect(ondevicechange).toHaveBeenCalled()
      expect(eventListener).toHaveBeenCalled()
    })
    test('enumerate devices no longer lists the device', () => {
      const device = anyDevice()
      fake.attach(device)
      fake.remove(device)
      return fake.enumerateDevices().then((devices) => expect(devices).toHaveLength(0))
    })
  })

  describe('getUserMedia', () => {
    describe('no constraints', () => {
      test('returns type error', () => {
        const stream = fake.getUserMedia()
        return expect(stream).rejects.toThrow(
          new TypeError(
            `Failed to execute 'getUserMedia' on 'MediaDevices': At least one of audio and video must be requested`,
          ),
        )
      })
      test('scenario', async () => {
        expect(await runAndReport(fake, passUndefined)).toBe('')
      })
    })

    describe('all passed constraints are false', () => {
      test('returns type error', () => {
        const stream = fake.getUserMedia(allConstraintsFalse.constraints)
        return expect(stream).rejects.toThrow(
          new TypeError(
            `Failed to execute 'getUserMedia' on 'MediaDevices': At least one of audio and video must be requested`,
          ),
        )
      })
      test('scenario', async () => {
        expect(await runAndReport(fake, allConstraintsFalse)).toBe('')
      })
    })

    describe('not device of this type is attached', () => {
      test('return a DOMException', async () => {
        const stream = fake.getUserMedia(requestedDeviceTypeNotAttached.constraints)
        await expect(stream).rejects.domException(`Requested device not found`, 'NotFoundError')
      })
      test('scenario', async () => {
        expect(await runAndReport(fake, requestedDeviceTypeNotAttached)).toBe('')
      })
    })

    test('not passing video and audio property results in type error with message', () => {
      const stream = fake.getUserMedia({})
      return expect(stream).rejects.toThrow(
        new TypeError(
          `Failed to execute 'getUserMedia' on 'MediaDevices': At least one of audio and video must be requested`,
        ),
      )
    })

    describe('reject promise in case no videoinput device is attached', () => {
      test('reject promise in case no videoinput device is attached', () => {
        fake.noDevicesAttached()
        const stream = fake.getUserMedia(requestedDeviceTypeNotAttached.constraints)
        return expect(stream).rejects.toThrow(new DOMException('Requested device not found'))
      })
      test('scenario', async () => {
        fake.noDevicesAttached()
        expect(await runAndReport(fake, requestedDeviceTypeNotAttached)).toBe('')
      })
    })

    test('return track for an attached camera', async () => {
      fake.attach(anyCamera())
      const stream = await fake.getUserMedia({ video: true })

      expect(stream).toIncludeVideoTrack()
    })

    describe('return another device of the same kind in case no device with the given id is attached', () => {
      test('scenario', async () => {
        fake.attach(anyCamera({ deviceId: 'actually connected' }))
        expect(await runAndReport(fake, noDeviceWithDeviceId)).toBe('')
      })
    })

    describe('exact deviceId constraint', () => {
      test('return the connected device', async () => {
        fake.attach(anyCamera({ deviceId: 'exact device identifier' }))
        const stream = await fake.getUserMedia({
          video: {
            deviceId: {
              exact: 'exact device identifier',
            },
          },
        })
        expect(stream).toIncludeVideoTrack()
      })

      test('reject if there is no device with a matching deviceId even if there are other video devices', async () => {
        fake.attach(anyCamera({ deviceId: 'not what you are looking for' }))
        const response = fake.getUserMedia({
          video: {
            deviceId: {
              exact: 'exact device identifier',
            },
          },
        })
        await expect(response).rejects.toThrow()
      })
    })

    test('return videoinput with matching device id', async () => {
      fake.attach(anyCamera({ deviceId: 'not this one' }))
      fake.attach(anyCamera({ deviceId: 'attached', label: 'match' }))
      fake.attach(anyCamera({ deviceId: 'nope' }))
      const stream = await fake.getUserMedia({ video: { deviceId: 'attached' } })
      expect(stream).toBeDefined()
      expect(stream.getTracks()).toHaveLength(1)
      const track = stream.getVideoTracks()[0]
      expect(track.label).toBe('match')
      expect(track.id).toBeUuid()
      expect(track.enabled).toBe(true)
      expect(track.readyState).toBe('live')
      expect(track.kind).toBe('video')
    })

    test('return audioinput with matching device id', async () => {
      fake.attach(anyMicrophone({ deviceId: 'not this one' }))
      fake.attach(anyMicrophone({ deviceId: 'attached', label: 'match' }))
      fake.attach(anyMicrophone({ deviceId: 'nope' }))
      const stream = await fake.getUserMedia({ audio: { deviceId: 'attached' } })
      expect(stream).toBeDefined()
      expect(stream.getTracks()).toHaveLength(1)
      const track = stream.getAudioTracks()[0]
      expect(track.label).toBe('match')
      expect(track.id).toBeUuid()
      expect(track.enabled).toBe(true)
      expect(track.readyState).toBe('live')
      expect(track.kind).toBe('audio')
    })

    test('provide access to the passed video constraints', async () => {
      fake.attach(anyCamera())
      const constraintInput = { facingMode: 'user' }
      const stream = await fake.getUserMedia({ video: constraintInput })
      const trackConstraints = stream.getTracks()[0].getConstraints()
      expect(trackConstraints).toEqual({ facingMode: 'user' })
      expect(trackConstraints).not.toBe(constraintInput)
    })

    test('replace true constraint with an empty object', async () => {
      fake.attach(anyCamera())
      const stream = await fake.getUserMedia({ video: true })
      expect(stream.getTracks()[0].getConstraints()).toEqual({})
    })

    test('provide access to the passed audio constraints', async () => {
      fake.attach(anyMicrophone())
      const stream = await fake.getUserMedia({ audio: { noiseSuppression: true } })
      expect(stream.getTracks()[0].getConstraints()).toEqual({ noiseSuppression: true })
    })
  })

  describe('dispatch', () => {
    test('forward devicechange events to the listeners', () => {
      const ondevicechange = jest.fn()
      const eventListener = jest.fn()
      fake.ondevicechange = ondevicechange
      fake.addEventListener('devicechange', eventListener)
      fake.dispatchEvent(new Event('devicechange'))
      expect(ondevicechange).toHaveBeenCalled()
    })
  })
})

describe('enumerateDevices', () => {
  test('include speakers on chrome', async () => {
    const fake = new MediaDevicesFake(anyContext(), stillHaveToAskForDeviceAccess(), new OpenMediaTracks())
    fake.attach(anySpeaker({ label: 'should not be returned' }))
    const mediaDeviceInfos = await fake.enumerateDevices()
    expect(mediaDeviceInfos).toHaveLength(1)
    expect(mediaDeviceInfos[0].label).toBe('')
  })

  describe('speaker label is connected to microphone permissions', () => {
    test('label is returned if microphone permissions are granted', async () => {
      const fake = new MediaDevicesFake(anyContext(), anyUserConsent({ microphone: 'granted' }), new OpenMediaTracks())
      fake.attach(anySpeaker({ label: 'the speaker' }))
      const mediaDeviceInfos = await fake.enumerateDevices()
      expect(mediaDeviceInfos).toHaveLength(1)
      expect(mediaDeviceInfos[0].label).toBe('the speaker')
    })

    test('label is returned if microphone permissions are granted', async () => {
      const fake = new MediaDevicesFake(anyContext(), anyUserConsent({ microphone: 'denied' }), new OpenMediaTracks())
      fake.attach(anySpeaker({ label: 'should not be returned' }))
      const mediaDeviceInfos = await fake.enumerateDevices()
      expect(mediaDeviceInfos).toHaveLength(1)
      expect(mediaDeviceInfos[0].label).toBe('')
    })
  })

  describe('still have to ask for device access', () => {
    test('label and deviceId in MediaDeviceInfo is set to empty string', async () => {
      const fake = new MediaDevicesFake(anyContext(), stillHaveToAskForDeviceAccess(), new OpenMediaTracks())
      fake.attach(anyMicrophone({ label: 'The microphone', deviceId: 'microphone identifier' }))
      const devices = await fake.enumerateDevices()
      const microphone = devices[0]
      expect(microphone.label).toEqual('')
      expect(microphone.deviceId).toEqual('')
    })
  })
})

const allPermissionsGranted = () => {
  return anyUserConsent({
    camera: 'granted',
    microphone: 'granted',
  })
}

const stillHaveToAskForDeviceAccess = () => {
  return anyUserConsent({
    camera: 'prompt',
    microphone: 'prompt',
  })
}

const anyUserConsent = (override: Partial<UserConsent> = {}) => {
  const camera = override.camera ?? 'prompt'
  const microphone = override.microphone ?? 'prompt'
  return new UserConsentTracker(anyContext(), { camera, microphone })
}

const runAndReport = async (fake: MediaDevicesFake, scenario: Scenario) => {
  const stream = fake.getUserMedia(scenario.constraints)
  const checks = scenario.expected.granted?.checks ?? []
  const results = await Promise.all(
    checks.map(async (check) => {
      return {
        what: check.what,
        details: await check.predicate(stream),
      }
    }),
  )

  return results
    .filter((check) => !check.details.success)
    .map((failed) => {
      const lines = []
      lines.push('check: ' + failed.what)
      const messages = failed.details.messages ?? ['no message']
      messages.map((message) => ` - ${message}`).forEach((line) => lines.push(line))
      return lines.join('\n')
    })
    .join('\n')
}
