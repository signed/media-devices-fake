import {MediaDeviceDescription} from './MediaDeviceDescription'
import {MediaDeviceInfoFake} from './MediaDeviceInfoFake'
import {MediaStreamTrackFake} from './MediaStreamTrackFake'

type Entry = {mediaDevice: MediaDeviceInfoFake; mediaTrack: MediaStreamTrackFake}

function assertUnreachable(_: 'you missed a case'): never {
  throw new Error("Didn't expect to get here")
}

function toKind(toRemove: 'camera' | 'microphone'): MediaDeviceKind {
  if (toRemove === 'camera') {
    return 'videoinput'
  }
  if (toRemove === 'microphone') {
    return 'audioinput'
  }
  assertUnreachable(toRemove)
}

export class OpenMediaTracks {
  private readonly entries: Entry[] = []

  track(mediaDevice: MediaDeviceInfoFake, mediaTrack: MediaStreamTrackFake) {
    this.entries.push({mediaDevice, mediaTrack})
  }

  allFor(toRemove: MediaDeviceDescription | 'camera' | 'microphone'): MediaStreamTrackFake[] {
    if (typeof toRemove === 'string') {
      const kind = toKind(toRemove)
      return this.entries
        .filter((entry) => {
          return entry.mediaDevice.kind === kind
        })
        .map((entry) => entry.mediaTrack)
    }
    return this.entries
      .filter((entry) => {
        const trackedDevice = entry.mediaDevice
        return (
          trackedDevice.kind === toRemove.kind &&
          trackedDevice.groupId === toRemove.groupId &&
          trackedDevice.deviceId === toRemove.deviceId
        )
      })
      .map((entry) => entry.mediaTrack)
  }
}
