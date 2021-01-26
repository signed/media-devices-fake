import {MediaDeviceDescription} from './MediaDeviceDescription'
import {MediaDeviceInfoFake} from './MediaDeviceInfoFake'
import {MediaStreamTrackFake} from './MediaStreamTrackFake'

type Entry = {mediaDevice: MediaDeviceInfoFake; mediaTrack: MediaStreamTrackFake}

export class OpenMediaTracks {
  private readonly entries: Entry[] = []

  track(mediaDevice: MediaDeviceInfoFake, mediaTrack: MediaStreamTrackFake) {
    this.entries.push({mediaDevice, mediaTrack})
  }

  allFor(toRemove: MediaDeviceDescription): MediaStreamTrackFake[] {
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
