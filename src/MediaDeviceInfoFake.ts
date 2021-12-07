import { Context } from './context'
import { MediaDeviceDescription } from './MediaDeviceDescription'

export class MediaDeviceInfoFake implements MediaDeviceInfo {
  constructor(private readonly _context: Context, private readonly mediaDeviceDescription: MediaDeviceDescription) {}

  get deviceId(): string {
    return this.mediaDeviceDescription.deviceId
  }

  get groupId(): string {
    return this.mediaDeviceDescription.groupId
  }

  get kind(): MediaDeviceKind {
    return this.mediaDeviceDescription.kind
  }

  get label(): string {
    return this.mediaDeviceDescription.label
  }

  toJSON(): any {
    this._context.notImplemented.call('MediaDeviceInfo.toJSON()')
  }
}
