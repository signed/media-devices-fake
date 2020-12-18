import {notImplemented} from '../not-implemented'
import {PermissionState, UserConsentTracker} from '../UserConsentTracker'
import {PermissionStatusFake} from './PermissionStatusFake'

export class PermissionsFake implements Permissions {
  constructor(private readonly consentTracker: UserConsentTracker) {}

  query(
    permissionDesc:
      | PermissionDescriptor
      | DevicePermissionDescriptor
      | MidiPermissionDescriptor
      | PushPermissionDescriptor
  ): Promise<PermissionStatus> {
    if (permissionDesc.name === 'camera') {
      const permissionState = this.consentTracker.userConsentStateFor('camera')
      return Promise.resolve(new PermissionStatusFake(PermissionsFake.translate(permissionState)))
    }
    if (permissionDesc.name === 'microphone') {
      const permissionState = this.consentTracker.userConsentStateFor('microphone')
      return Promise.resolve(new PermissionStatusFake(PermissionsFake.translate(permissionState)))
    }
    throw notImplemented('only camera ')
  }

  private static translate(p: PermissionState) {
    switch (p) {
      case PermissionState.granted:
        return 'granted'
      case PermissionState.prompt:
        return 'prompt'
      case PermissionState.denied:
        return 'denied'
      default:
        throw notImplemented('should not happen')
    }
  }
}
