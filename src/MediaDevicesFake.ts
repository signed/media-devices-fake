import { Deferred } from './Deferred'
import { LocalListenerPropertySync } from './LocalListenerPropertySync'
import { MediaDeviceDescription } from './MediaDeviceDescription'
import { MediaDeviceInfoFake } from './MediaDeviceInfoFake'
import { MediaStreamFake, mediaStreamId } from './MediaStreamFake'
import { initialMediaStreamTrackProperties, MediaStreamTrackFake, TrackKind } from './MediaStreamTrackFake'
import { notImplemented } from './not-implemented'
import { OpenMediaTracks } from './OpenMediaTracks'
import { UserConsentTracker } from './UserConsentTracker'

type DeviceChangeListener = (this: MediaDevices, ev: Event) => any
const descriptionMatching = (description: MediaDeviceDescription) => (device: MediaDeviceDescription) =>
  device.deviceId === description.deviceId && device.groupId === description.groupId

const fit2 = (actual: string, ideal: string): number => (actual === ideal ? 0 : 1)

type Constraint = (device: MediaDeviceInfoFake) => number

class ConstrainSet {
  private readonly constraints: Constraint[] = []

  constructor(requested: boolean | MediaTrackConstraints) {
    if (typeof requested === 'boolean') {
      return
    }
    const deviceId = requested.deviceId
    if (deviceId !== undefined) {
      if (typeof deviceId !== 'string') {
        throw notImplemented('only basic deviceId of type string is supported at the moment')
      }
      this.constraints.push((device: MediaDeviceInfoFake) => {
        return fit2(device.deviceId, deviceId)
      })
    }
  }

  fitnessDistanceFor(device: MediaDeviceInfoFake): number {
    return this.constraints.reduce((acc, curr) => acc + curr(device), 0)
  }
}

const selectSettings = (
  mediaTrackConstraints: MediaTrackConstraints | boolean,
  devices: MediaDeviceInfoFake[],
): MediaDeviceInfoFake | void => {
  const constraintSet = new ConstrainSet(mediaTrackConstraints)
  const viableDevice = devices
    .map((device) => {
      return {
        device,
        fitness: constraintSet.fitnessDistanceFor(device),
      }
    })
    .filter((scoredDevice) => scoredDevice.fitness !== Infinity)
  viableDevice.sort((a, b) => a.fitness - b.fitness)
  return viableDevice[0].device
}

const trackConstraintsFrom = (
  constraints: MediaStreamConstraints,
): {
  mediaTrackConstraints: boolean | MediaTrackConstraints
  trackKind: TrackKind
  deviceKind: MediaDeviceKind
} => {
  if (constraints.video) {
    const mediaTrackConstraints = constraints.video
    const trackKind = 'video'
    const deviceKind = 'videoinput'
    return {
      mediaTrackConstraints,
      trackKind,
      deviceKind,
    }
  }
  if (constraints.audio) {
    const mediaTrackConstraints = constraints.audio
    const trackKind = 'audio'
    const deviceKind = 'audioinput'
    return {
      mediaTrackConstraints,
      trackKind,
      deviceKind,
    }
  }

  throw new Error('with the current assumptions this should not happen')
}

const tryToOpenAStreamFor = (
  deferred: Deferred<MediaStream>,
  deviceKind: MediaDeviceKind,
  trackKind: TrackKind,
  mediaTrackConstraints: boolean | MediaTrackConstraints,
  allDevices: MediaDeviceInfoFake[],
  openMediaTracks: OpenMediaTracks,
): void => {
  const devices = allDevices.filter((device) => device.kind === deviceKind)
  if (devices.length === 0) {
    deferred.reject(new DOMException('Requested device not found', 'NotFoundError'))
    return
  }
  const selectedDevice = selectSettings(mediaTrackConstraints, devices)
  if (selectedDevice === undefined) {
    throw notImplemented('should this be an over constrained error?')
  }

  const mediaTrack = new MediaStreamTrackFake(initialMediaStreamTrackProperties(selectedDevice.label, trackKind))
  openMediaTracks.track(selectedDevice, mediaTrack)
  mediaTrack.onTerminated = (track) => openMediaTracks.remove(track)

  const mediaTracks = [mediaTrack]
  const mediaStream = new MediaStreamFake(mediaStreamId(), mediaTracks)

  deferred.resolve(mediaStream)
}

// this looks interesting
// https://github.com/fippo/dynamic-getUserMedia/blob/master/content.js
export class MediaDevicesFake extends EventTarget implements MediaDevices {
  private readonly _deviceDescriptions: MediaDeviceDescription[] = []
  private readonly _onDeviceChangeListener: LocalListenerPropertySync<DeviceChangeListener>

  constructor(
    private readonly _userConsentTracker: UserConsentTracker,
    private readonly openMediaTracks: OpenMediaTracks,
  ) {
    super()
    this._onDeviceChangeListener = new LocalListenerPropertySync<DeviceChangeListener>(this, 'devicechange')
  }

  private get devices(): MediaDeviceInfoFake[] {
    return this._deviceDescriptions
      .map((description) => {
        const { kind } = description
        const accessAllowed = this._userConsentTracker.accessAllowedFor(kind)
        const deviceId = accessAllowed ? description.deviceId : ''
        const label = accessAllowed ? description.label : ''
        return {
          ...description,
          deviceId,
          label,
        }
      })
      .map((description) => new MediaDeviceInfoFake(description))
  }

  get ondevicechange(): DeviceChangeListener | null {
    return this._onDeviceChangeListener.get()
  }

  set ondevicechange(listener: DeviceChangeListener | null) {
    this._onDeviceChangeListener.set(listener)
  }

  enumerateDevices(): Promise<MediaDeviceInfo[]> {
    return Promise.resolve(this.devices)
  }

  getSupportedConstraints(): MediaTrackSupportedConstraints {
    throw notImplemented('MediaDevicesFake.getSupportedConstraints()')
  }

  // https://w3c.github.io/mediacapture-main/#methods-5
  // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
  // https://blog.addpipe.com/common-getusermedia-errors/
  getUserMedia(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    if (
      constraints === undefined ||
      Object.keys(constraints).length === 0 ||
      (constraints.video === false && constraints.audio === false)
    ) {
      return Promise.reject(
        new TypeError(
          `Failed to execute 'getUserMedia' on 'MediaDevices': At least one of audio and video must be requested`,
        ),
      )
    }
    if (constraints.audio !== undefined && constraints.video !== undefined) {
      throw notImplemented('at the moment there is no support to request audio and video at the same time')
    }
    const { mediaTrackConstraints, trackKind, deviceKind } = trackConstraintsFrom(constraints)
    const deferred = new Deferred<MediaStream>()
    this._userConsentTracker.requestPermissionFor({
      deviceKind,
      granted: () => {
        tryToOpenAStreamFor(deferred, deviceKind, trackKind, mediaTrackConstraints, this.devices, this.openMediaTracks)
      },
      blocked: () => {
        deferred.reject(new DOMException('Permission denied', 'NotAllowedError'))
      },
    })
    return deferred.promise
  }

  public noDevicesAttached() {
    this._deviceDescriptions.forEach((descriptor) => this.remove(descriptor))
  }

  public attach(toAdd: MediaDeviceDescription) {
    if (this._deviceDescriptions.some(descriptionMatching(toAdd))) {
      throw notImplemented(`device with this description already attached
${JSON.stringify(toAdd, null, 2)}`)
    }
    // make a defensive copy to stop manipulation after attaching the device
    this._deviceDescriptions.push({ ...toAdd })
    this.informDeviceChangeListener()
  }

  public remove(toRemove: MediaDeviceDescription) {
    const index = this._deviceDescriptions.findIndex(descriptionMatching(toRemove))
    if (index >= 0) {
      this._deviceDescriptions.splice(index, 1)
      this.informDeviceChangeListener()
    }
  }

  private informDeviceChangeListener() {
    this.dispatchEvent(new Event('devicechange'))
  }
}
