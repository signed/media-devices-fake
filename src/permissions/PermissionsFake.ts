import {notImplemented} from '../not-implemented'
import {UserConsentTracker} from '../UserConsentTracker'
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
      return Promise.resolve(new PermissionStatusFake(permissionState))
    }
    if (permissionDesc.name === 'microphone') {
      const permissionState = this.consentTracker.userConsentStateFor('microphone')
      return Promise.resolve(new PermissionStatusFake(permissionState))
    }
    throw notImplemented('permissions.query() only supports camera and microphone for now')
  }
}
