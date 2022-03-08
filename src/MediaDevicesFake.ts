import { Context } from './context'
import { Deferred } from './Deferred'
import { LocalListenerPropertySync } from './LocalListenerPropertySync'
import { MediaDeviceDescription } from './MediaDeviceDescription'
import { MediaDeviceInfoFake } from './MediaDeviceInfoFake'
import { MediaStreamFake, mediaStreamId } from './MediaStreamFake'
import { initialMediaStreamTrackProperties, MediaStreamTrackFake, TrackKind } from './MediaStreamTrackFake'
import { OpenMediaTracks } from './OpenMediaTracks'
import { UserConsentTracker } from './UserConsentTracker'

type DeviceChangeListener = (this: MediaDevices, ev: Event) => any
const descriptionMatching = (description: MediaDeviceDescription) => (device: MediaDeviceDescription) =>
  device.deviceId === description.deviceId && device.groupId === description.groupId && device.kind === description.kind

const fit2 = (actual: string, ideal: string): number => (actual === ideal ? 0 : 1)
const fitExact = (actual: string, ideal: string): number => (actual === ideal ? 0 : Infinity)

type Constraint = (device: MediaDeviceInfoFake) => number

class ConstrainSet {
  private readonly _constraints: Constraint[] = []

  constructor(private readonly _context: Context, requested: boolean | MediaTrackConstraints) {
    if (typeof requested === 'boolean') {
      return
    }
    const deviceId = requested.deviceId
    if (deviceId === undefined) {
      return
    }

    if (typeof deviceId === 'string') {
      this._constraints.push((device: MediaDeviceInfoFake) => {
        return fit2(device.deviceId, deviceId)
      })
      return
    }

    if (typeof deviceId === 'object') {
      if (Array.isArray(deviceId)) {
        this._context.notImplemented.call('An array of deviceIds is not supported right now')
      } else {
        const exactDeviceId = deviceId.exact
        if (exactDeviceId === undefined) {
          return
        }
        if (Array.isArray(exactDeviceId)) {
          this._context.notImplemented.call('An array of exact deviceIds is not supported right now')
        } else {
          this._constraints.push((device: MediaDeviceInfoFake) => {
            return fitExact(device.deviceId, exactDeviceId)
          })
        }
      }
    }
  }

  fitnessDistanceFor(device: MediaDeviceInfoFake): number {
    return this._constraints.reduce((acc, curr) => acc + curr(device), 0)
  }
}

class OverconstrainedError extends DOMException {
  readonly constraint: string
  constructor(constraint: string, message?: string) {
    super(message, 'OverconstrainedError')
    this.constraint = constraint
  }
}

const selectSettings = (
  context: Context,
  mediaTrackConstraints: MediaTrackConstraints | boolean,
  devices: MediaDeviceInfoFake[],
): MediaDeviceInfoFake | void => {
  const constraintSet = new ConstrainSet(context, mediaTrackConstraints)
  const viableDevices = devices
    .map((device) => {
      return {
        device,
        fitness: constraintSet.fitnessDistanceFor(device),
      }
    })
    .filter((scoredDevice) => scoredDevice.fitness !== Infinity)
  viableDevices.sort((a, b) => a.fitness - b.fitness)
  if (viableDevices.length === 0) {
    return undefined
  }
  return viableDevices[0].device
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

const deepClone = (mediaTrackConstraints: MediaTrackConstraints) => JSON.parse(JSON.stringify(mediaTrackConstraints))

const tryToOpenAStreamFor = (
  context: Context,
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
  const selectedDevice = selectSettings(context, mediaTrackConstraints, devices)
  if (selectedDevice === undefined) {
    //constraint name is hardcoded here, because right now we only check for deviceId
    // Firefox also has a message and a stack
    deferred.reject(new OverconstrainedError('deviceId', ''))
    return
  }

  const constraintObject = typeof mediaTrackConstraints === 'boolean' ? {} : deepClone(mediaTrackConstraints)
  const mediaTrack = new MediaStreamTrackFake(
    context,
    initialMediaStreamTrackProperties(selectedDevice.label, trackKind, constraintObject),
  )
  openMediaTracks.track(selectedDevice, mediaTrack)
  mediaTrack.onTerminated = (track) => openMediaTracks.remove(track)

  const mediaTracks = [mediaTrack]
  const mediaStream = new MediaStreamFake(context, mediaStreamId(), mediaTracks)

  deferred.resolve(mediaStream)
}

// this looks interesting
// https://github.com/fippo/dynamic-getUserMedia/blob/master/content.js
export class MediaDevicesFake extends EventTarget implements MediaDevices {
  private readonly _deviceDescriptions: MediaDeviceDescription[] = []
  private readonly _onDeviceChangeListener: LocalListenerPropertySync<DeviceChangeListener>

  constructor(
    private readonly _context: Context,
    private readonly _userConsentTracker: UserConsentTracker,
    private readonly _openMediaTracks: OpenMediaTracks,
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
      .map((description) => new MediaDeviceInfoFake(this._context, description))
  }

  get ondevicechange(): DeviceChangeListener | null {
    return this._onDeviceChangeListener.get()
  }

  set ondevicechange(listener: DeviceChangeListener | null) {
    this._onDeviceChangeListener.set(listener)
  }

  enumerateDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = this.devices
      return Promise.resolve(devices)
    } catch (e) {
      return Promise.reject(e)
    }
  }

  getDisplayMedia(constraints?: DisplayMediaStreamConstraints): Promise<MediaStream> {
    this._context.notImplemented.call('MediaDevicesFake.getDisplayMedia() is not implemented')
  }

  getSupportedConstraints(): MediaTrackSupportedConstraints {
    this._context.notImplemented.call('MediaDevicesFake.getSupportedConstraints()')
  }

  // https://w3c.github.io/mediacapture-main/#methods-5
  // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
  // https://blog.addpipe.com/common-getusermedia-errors/
  getUserMedia(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    this._context.reporter.report(() => ['getUserMedia', 'constraints' + ':' + JSON.stringify(constraints, null, 2)])
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
      this._context.notImplemented.call('at the moment there is no support to request audio and video at the same time')
    }
    const { mediaTrackConstraints, trackKind, deviceKind } = trackConstraintsFrom(constraints)
    const deferred = new Deferred<MediaStream>()
    this._userConsentTracker.requestPermissionFor({
      deviceKind,
      granted: () => {
        tryToOpenAStreamFor(
          this._context,
          deferred,
          deviceKind,
          trackKind,
          mediaTrackConstraints,
          this.devices,
          this._openMediaTracks,
        )
      },
      blocked: () => {
        deferred.reject(new DOMException('Permission denied', 'NotAllowedError'))
      },
    })
    return deferred.promise
  }

  public noDevicesAttached() {
    const currentlyAttachedDevices = [...this._deviceDescriptions]
    currentlyAttachedDevices.forEach((descriptor) => this.remove(descriptor))
  }

  public attach(toAdd: MediaDeviceDescription) {
    if (this._deviceDescriptions.some(descriptionMatching(toAdd))) {
      this._context.notImplemented.call(`device with this description already attached
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
    this._openMediaTracks.allFor(toRemove).forEach((mediaStreamFake) => mediaStreamFake.deviceRemoved())
  }

  private informDeviceChangeListener() {
    this.dispatchEvent(new Event('devicechange'))
  }
}
