import type { MediaDevicesControl } from './index.js'
import {
  allAccessGranted,
  allAccessDenied,
  anyCamera,
  anyDevice,
  anyMicrophone,
  forgeMediaDevices,
  RequestedMediaInput,
  stillHaveToAskForDeviceAccess,
} from './index.js'
import './matchers/dom-exception.js'
import './matchers/to-include-video-track.js'
import './matchers/to-include-audio-track.js'

let control: MediaDevicesControl
afterEach(() => {
  control.uninstall()
})

describe('MediaDevicesFake', () => {
  describe('still have to ask for device access', () => {
    beforeEach(() => {
      control = forgeMediaDevices(stillHaveToAskForDeviceAccess())
      control.installInto(window)
    })

    test('return a video stream from an attached camera after granting access', async () => {
      control.attach(anyCamera({ label: 'The Camera' }))

      const navigator = window.navigator
      expect((await navigator.permissions.query({ name: 'camera' })).state).toBe('prompt')
      const userMediaPromise = navigator.mediaDevices.getUserMedia({ video: true })
      const permissionPrompt = await control.deviceAccessPrompt()
      expect(permissionPrompt.requestedPermissions()).toEqual([RequestedMediaInput.Camera])
      permissionPrompt.takeAction('allow')
      expect((await userMediaPromise).getVideoTracks()[0].label).toEqual('The Camera')
      expect((await navigator.permissions.query({ name: 'camera' })).state).toBe('granted')

      // 2nd time should not need a permission prompt
      expect(await navigator.mediaDevices.getUserMedia({ video: true })).toIncludeVideoTrack()
    })

    test('chain multiple permission prompts for different device types after each other', async () => {
      control.attach(anyCamera(), anyMicrophone())
      const navigator = window.navigator
      const videoPromptPromise = control.deviceAccessPrompt()
      const videoPromise = navigator.mediaDevices.getUserMedia({ video: true })
      const audioPromise = navigator.mediaDevices.getUserMedia({ audio: true })
      const videoPrompt = await videoPromptPromise
      expect(videoPrompt.requestedPermissions()).toEqual([RequestedMediaInput.Camera])
      videoPrompt.takeAction('allow')
      expect(await videoPromise).toIncludeVideoTrack()
      const audioPrompt = await control.deviceAccessPrompt()
      expect(audioPrompt.requestedPermissions()).toEqual([RequestedMediaInput.Microphone])
      await expect(audioPromise).rejects
    })

    test('resolve/reject pending user media request once consent is clear ', async () => {
      control.attach(anyMicrophone())
      const navigator = window.navigator
      const willBeDismissed = navigator.mediaDevices.getUserMedia({ audio: true })
      const willBeGranted = navigator.mediaDevices.getUserMedia({ audio: true })
      const noMorePrompt = navigator.mediaDevices.getUserMedia({ audio: true })

      const firstPrompt = await control.deviceAccessPrompt()
      firstPrompt.takeAction('dismiss')
      await expect(willBeDismissed).rejects.domException('Permission dismissed')

      const secondPrompt = await control.deviceAccessPrompt()
      secondPrompt.takeAction('allow')
      expect(await willBeGranted).toIncludeAudioTrack()

      expect(await noMorePrompt).toIncludeAudioTrack()
    })

    test('reject promise with a DomException after blocking access', async () => {
      const { attach, deviceAccessPrompt } = control
      attach(anyMicrophone())
      const navigator = window.navigator

      const userMediaPromise = navigator.mediaDevices.getUserMedia({ audio: true })
      const permissionPrompt = await deviceAccessPrompt()
      expect(permissionPrompt.requestedPermissions()).toEqual([RequestedMediaInput.Microphone])

      permissionPrompt.takeAction('block')
      await expect(userMediaPromise).rejects.domException('Permission denied', 'NotAllowedError')

      expect((await navigator.permissions.query({ name: 'microphone' })).state).toBe('denied')

      // 2nd time should not need a permission prompt
      await expect(navigator.mediaDevices.getUserMedia({ audio: true })).rejects.domException(
        'Permission denied',
        'NotAllowedError',
      )
    })
  })
  describe('device access granted', () => {
    beforeEach(() => {
      control = forgeMediaDevices(allAccessGranted())
      control.installInto(window)
    })

    test('return a video stream from an attached camera', async () => {
      control.attach(anyCamera({ label: 'The Camera' }))
      const userMedia = await window.navigator.mediaDevices.getUserMedia({ video: true })
      expect(userMedia.getVideoTracks()[0].label).toEqual('The Camera')
    })
    test('reject media stream requests if no device is available', async () => {
      const onlyMicrophone = anyMicrophone()
      control.attach(onlyMicrophone)
      control.remove(onlyMicrophone)
      await expect(window.navigator.mediaDevices.getUserMedia({ audio: true })).rejects.domException(
        'Requested device not found',
        'NotFoundError',
      )
    })
  })
  describe('device access blocked', () => {
    beforeEach(() => {
      control = forgeMediaDevices(allAccessDenied())
      control.installInto(window)
    })

    test('reject media stream requests', async () => {
      await expect(window.navigator.mediaDevices.getUserMedia({ audio: true })).rejects.domException(
        'Permission denied',
        'NotAllowedError',
      )
    })
  })
  describe('attach', () => {
    beforeEach(() => {
      control = forgeMediaDevices(allAccessDenied())
      control.installInto(window)
    })

    test('an array of devices', async () => {
      control.attach([anyDevice()])
      const devices = await window.navigator.mediaDevices.enumerateDevices()
      expect(devices).toHaveLength(1)
    })
  })
})

describe('PermissionsFake', () => {
  beforeEach(() => {
    control = forgeMediaDevices(stillHaveToAskForDeviceAccess())
    control.installInto(window)
  })
  describe('notify onchange listener on permission state change', () => {
    test('for camera', async () => {
      control.attach(anyCamera())
      const navigator = window.navigator
      const permissionStatus = await navigator.permissions.query({ name: 'camera' })
      expect(permissionStatus.state).toEqual('prompt')
      const onChange = jest.fn()
      const onchange = jest.fn()
      permissionStatus.onchange = onChange
      permissionStatus.addEventListener('change', onchange)
      navigator.mediaDevices.getUserMedia({ video: true })
      const prompt = await control.deviceAccessPrompt()
      prompt.takeAction('allow')
      expect(onChange).toHaveBeenCalled()
      expect(permissionStatus.state).toEqual('granted')
    })
    test('for microphone', async () => {
      const navigator = window.navigator
      control.attach(anyMicrophone())
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' })
      expect(permissionStatus.state).toEqual('prompt')
      const onChange = jest.fn()
      const onchange = jest.fn()
      permissionStatus.onchange = onChange
      permissionStatus.addEventListener('change', onchange)
      navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {})
      const prompt = await control.deviceAccessPrompt()
      prompt.takeAction('block')
      expect(onChange).toHaveBeenCalled()
      expect(onchange).toHaveBeenCalled()
      expect(permissionStatus.state).toEqual('denied')
    })
    test('change permission after creation in one call', async () => {
      control.setPermissionFor({ camera: 'granted', microphone: 'granted' })
      expect(await permissionStateFor('camera')).toBe('granted')
      expect(await permissionStateFor('microphone')).toBe('granted')

      control.setPermissionFor({ camera: 'denied' })
      expect(await permissionStateFor('camera')).toBe('denied')
      expect(await permissionStateFor('microphone')).toBe('granted')

      control.setPermissionFor({ microphone: 'denied' })
      expect(await permissionStateFor('camera')).toBe('denied')
      expect(await permissionStateFor('microphone')).toBe('denied')
    })
  })
})

const permissionStateFor = async (name: 'camera' | 'microphone') => {
  const cameraPermission = await window.navigator.permissions.query({ name })
  return cameraPermission.state
}
