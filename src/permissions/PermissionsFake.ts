import { Context } from '../context.js'
import { UserConsentTracker } from '../UserConsentTracker.js'

export class PermissionsFake implements Permissions {
  constructor(private readonly context: Context, private readonly consentTracker: UserConsentTracker) {}

  query(
    permissionDesc:
      | PermissionDescriptor
      | DevicePermissionDescriptor
      | MidiPermissionDescriptor
      | PushPermissionDescriptor,
  ): Promise<PermissionStatus> {
    const kind = permissionDesc.name
    if (kind !== 'camera' && kind !== 'microphone') {
      this.context.notImplemented.call(`permissions.query() does not support ${kind} for now`)
    }
    return Promise.resolve(this.consentTracker.permissionStatusFor(kind))
  }
}
