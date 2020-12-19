import {notImplemented} from '../not-implemented'
import {UserConsentTracker} from '../UserConsentTracker'

export class PermissionsFake implements Permissions {
  constructor(private readonly consentTracker: UserConsentTracker) {}

  query(
    permissionDesc:
      | PermissionDescriptor
      | DevicePermissionDescriptor
      | MidiPermissionDescriptor
      | PushPermissionDescriptor
  ): Promise<PermissionStatus> {
    const kind = permissionDesc.name
    if (kind !== 'camera' && kind !== 'microphone') {
      throw notImplemented(`permissions.query() does not support ${kind} for now`)
    }
    return Promise.resolve(this.consentTracker.permissionStatusFor(kind))
  }
}
