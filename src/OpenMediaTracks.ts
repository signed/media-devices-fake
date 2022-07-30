import { MediaDeviceDescription } from './MediaDeviceDescription.js'
import { MediaDeviceInfoFake } from './MediaDeviceInfoFake.js'
import { MediaStreamTrackFake } from './MediaStreamTrackFake.js'

type Entry = { mediaDevice: MediaDeviceInfoFake; mediaTrack: MediaStreamTrackFake }

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

  track(mediaDevice: MediaDeviceInfoFake, mediaStreamTrack: MediaStreamTrackFake) {
    this.entries.push({ mediaDevice, mediaTrack: mediaStreamTrack })
  }

  remove(toRemove: MediaStreamTrackFake) {
    const index = this.entries.findIndex((entry) => entry.mediaTrack === toRemove)
    if (index === -1) {
      return
    }
    this.entries.splice(index, 1)
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
