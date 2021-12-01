export { MediaDeviceDescription } from './MediaDeviceDescription'
export { anyMicrophone, anyCamera, anyDevice } from './DeviceMother'
export { PermissionPrompt, PermissionPromptAction, RequestedMediaInput } from './UserConsentTracker'
import { MediaDeviceDescription } from './MediaDeviceDescription'
import { MediaDevicesFake } from './MediaDevicesFake'
import { OpenMediaTracks } from './OpenMediaTracks'
import { PermissionsFake } from './permissions/PermissionsFake'
import {
  allConstraintsFalse,
  existingDevice,
  noDeviceWithDeviceId,
  passUndefined,
  requestedDeviceTypeNotAttached,
  scenarios as all,
} from './Scenarios'
import { PermissionPrompt, UserConsentTracker } from './UserConsentTracker'

export type InitialSetup = {
  attachedDevices?: MediaDeviceDescription[]
  microphone?: PermissionState
  camera?: PermissionState
}

type InitialSetupWithoutPermissions = Omit<InitialSetup, 'microphone' | 'camera'>

export const stillHaveToAskForDeviceAccess = (additional: InitialSetupWithoutPermissions = {}): InitialSetup => {
  return {
    microphone: 'prompt',
    camera: 'prompt',
    attachedDevices: [],
    ...additional,
  }
}

export const allAccessAllowed = (additional: InitialSetupWithoutPermissions = {}): InitialSetup => {
  return {
    microphone: 'granted',
    camera: 'granted',
    attachedDevices: [],
    ...additional,
  }
}

export const allAccessBlocked = (additional: InitialSetupWithoutPermissions = {}): InitialSetup => {
  return {
    microphone: 'denied',
    camera: 'denied',
    attachedDevices: [],
    ...additional,
  }
}

export interface MediaDevicesControl {
  mediaDevices: MediaDevices
  permissions: Permissions

  attach(toAdd: MediaDeviceDescription): void

  remove(toRemove: MediaDeviceDescription): void

  deviceAccessPrompt(): Promise<PermissionPrompt>

  setPermissionFor(type: 'camera' | 'microphone', state: PermissionState): void
}

export const forgeMediaDevices = (initial: InitialSetup = {}): MediaDevicesControl => {
  const camera = initial.camera ?? 'prompt'
  const microphone = initial.microphone ?? 'prompt'
  const consentTracker = new UserConsentTracker({ camera, microphone })
  const openMediaTracks = new OpenMediaTracks()
  const mediaDevicesFake = new MediaDevicesFake(consentTracker, openMediaTracks)
  const permissionsFake = new PermissionsFake(consentTracker)
  const attachedDevices = initial.attachedDevices ?? []
  attachedDevices.forEach((device) => mediaDevicesFake.attach(device))

  return new (class implements MediaDevicesControl {
    get mediaDevices(): MediaDevices {
      return mediaDevicesFake
    }

    get permissions(): Permissions {
      return permissionsFake
    }

    attach(toAdd: MediaDeviceDescription): void {
      mediaDevicesFake.attach(toAdd)
    }

    remove(toRemove: MediaDeviceDescription): void {
      mediaDevicesFake.remove(toRemove)
      openMediaTracks.allFor(toRemove).forEach((fake) => {
        fake.deviceRemoved()
      })
    }

    deviceAccessPrompt(): Promise<PermissionPrompt> {
      return consentTracker.deviceAccessPrompt()
    }

    setPermissionFor(type: 'camera' | 'microphone', state: PermissionState): void {
      consentTracker.setPermissionFor(type, state)
      if (state === 'granted') {
        return
      }
      openMediaTracks.allFor(type).forEach((fake) => {
        fake.permissionRevoked()
      })
    }
  })()
}

// todo testrig should be moved here
export { MediaStreamCheckResult, Scenario } from './Scenarios'

export const scenarios = {
  all,
  passUndefined,
  existingDevice,
  allConstraintsFalse,
  requestedDeviceTypeNotAttached,
  noDeviceWithDeviceId,
}
