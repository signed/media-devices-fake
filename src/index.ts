export { type MediaDeviceDescription } from './MediaDeviceDescription.js'
export { anyMicrophone, anyCamera, anyDevice, anySpeaker } from './DeviceMother.js'
export { type PermissionPrompt, type PermissionPromptAction, RequestedMediaInput } from './UserConsentTracker.js'
import { type Context } from './context.js'
import { type MediaDeviceDescription } from './MediaDeviceDescription.js'
import { MediaDevicesFake } from './MediaDevicesFake.js'
import { type NotImplemented, ThrowingNotImplemented } from './not-implemented.js'
import { OpenMediaTracks } from './OpenMediaTracks.js'
import { PermissionsFake } from './permissions/PermissionsFake.js'
import { DefaultReporter, NoopReporter, type Reporter } from './reporter.js'
import {
  allConstraintsFalse,
  existingDevice,
  noDeviceWithDeviceId,
  passUndefined,
  requestedDeviceTypeNotAttached,
  scenarios as all,
} from './Scenarios.js'
import { type PermissionPrompt, type UserConsent, UserConsentTracker } from './UserConsentTracker.js'

export type LogLevel = 'off' | 'all'

export type PermissionSetup = Partial<UserConsent>

export type InitialSetup = PermissionSetup & {
  attachedDevices?: MediaDeviceDescription[]
  logLevel?: LogLevel
}

export const stillHaveToAskForDeviceAccess = (additional: PermissionSetup = {}): PermissionSetup => {
  return {
    microphone: 'prompt',
    camera: 'prompt',
    ...additional,
  }
}

export const allAccessGranted = (additional: PermissionSetup = {}): PermissionSetup => {
  return {
    microphone: 'granted',
    camera: 'granted',
    ...additional,
  }
}

export const allAccessDenied = (additional: PermissionSetup = {}): PermissionSetup => {
  return {
    microphone: 'denied',
    camera: 'denied',
    ...additional,
  }
}

export interface MediaDevicesControl {
  readonly mediaDevices: MediaDevices
  readonly permissions: Permissions

  installInto(target: Window): void

  uninstall(): void

  attach(...toAdd: MediaDeviceDescription[] | [MediaDeviceDescription[]]): void

  remove(toRemove: MediaDeviceDescription | 'all'): void

  deviceAccessPrompt(): Promise<PermissionPrompt>

  setPermissionFor(
    ...permissionSetup: [type: 'camera' | 'microphone', state: PermissionState] | [PermissionSetup]
  ): void
}

export const forgeMediaDevices = (initial: InitialSetup = {}): MediaDevicesControl => {
  const camera = initial.camera ?? 'prompt'
  const microphone = initial.microphone ?? 'prompt'
  const logLevel = initial.logLevel ?? 'off'
  const reporter: Reporter = logLevel === 'off' ? new NoopReporter() : new DefaultReporter()
  const notImplemented: NotImplemented = new ThrowingNotImplemented(reporter)
  const context: Context = {
    notImplemented,
    reporter,
  }
  const consentTracker = new UserConsentTracker(context, { camera, microphone })
  const openMediaTracks = new OpenMediaTracks()
  const mediaDevicesFake = new MediaDevicesFake(context, consentTracker, openMediaTracks)
  const permissionsFake = new PermissionsFake(context, consentTracker)
  const attachedDevices = initial.attachedDevices ?? []
  attachedDevices.forEach((device) => mediaDevicesFake.attach(device))

  const _setPermissionFor = (type: 'camera' | 'microphone', state: PermissionState): void => {
    consentTracker.setPermissionFor(type, state)
    if (state === 'granted') {
      return
    }
    openMediaTracks.allFor(type).forEach((fake) => {
      fake.permissionRevoked()
    })
  }

  return new (class implements MediaDevicesControl {
    private _target: Window | null = null
    private _mediaDevicesBackup: MediaDevices | null = null
    private _permissionBackup: Permissions | null = null

    get mediaDevices(): MediaDevices {
      return mediaDevicesFake
    }

    get permissions(): Permissions {
      return permissionsFake
    }

    installInto(target: Window) {
      this._target = target
      this._mediaDevicesBackup = target.navigator.mediaDevices
      this._permissionBackup = target.navigator.permissions
      Object.assign(this._target.navigator, { mediaDevices: mediaDevicesFake, permissions: permissionsFake })
    }

    uninstall() {
      if (this._target === null) {
        // nothing to restore
        return
      }
      Object.assign(this._target.navigator, {
        mediaDevices: this._mediaDevicesBackup,
        permissions: this._permissionBackup,
      })
      this._target = null
      this._mediaDevicesBackup = null
      this._permissionBackup = null
    }

    attach(...toAdd: MediaDeviceDescription[] | [MediaDeviceDescription[]]): void {
      let array: MediaDeviceDescription[] = toAdd as MediaDeviceDescription[]
      if (toAdd.length === 1) {
        const singleElement = toAdd[0]
        if (Array.isArray(singleElement)) {
          array = singleElement
        }
      }
      array.forEach((it) => mediaDevicesFake.attach(it))
    }

    remove(toRemove: MediaDeviceDescription | 'all'): void {
      if ('all' === toRemove) {
        mediaDevicesFake.noDevicesAttached()
        return
      }
      mediaDevicesFake.remove(toRemove)
    }

    deviceAccessPrompt(): Promise<PermissionPrompt> {
      return consentTracker.deviceAccessPrompt()
    }

    setPermissionFor(
      ...permissionSetup: [type: 'camera' | 'microphone', state: PermissionState] | [PermissionSetup]
    ): void {
      if (permissionSetup.length === 2) {
        _setPermissionFor(...permissionSetup)
        return
      }
      const [{ camera, microphone }] = permissionSetup
      if (camera) {
        _setPermissionFor('camera', camera)
      }
      if (microphone) {
        _setPermissionFor('microphone', microphone)
      }
    }
  })()
}

// todo testrig should be moved here
export { type MediaStreamCheckResult, type Scenario } from './Scenarios.js'

export const scenarios = {
  all,
  passUndefined,
  existingDevice,
  allConstraintsFalse,
  requestedDeviceTypeNotAttached,
  noDeviceWithDeviceId,
}
