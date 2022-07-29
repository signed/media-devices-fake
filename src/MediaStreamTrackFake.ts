import { Context } from './context'
import { LocalListenerPropertySync } from './LocalListenerPropertySync'
import { MediaDeviceInfoFake } from './MediaDeviceInfoFake'
import { uuidV4 } from './uuid'

type MediaStreamTrackEventListener = (this: MediaStreamTrack, ev: Event) => any
export type TrackKind = 'audio' | 'video'

export interface MediaStreamTrackProperties {
  id: MediaStreamTrack['id']
  readyState: MediaStreamTrack['readyState']
  enabled: MediaStreamTrack['enabled']
  kind: TrackKind
  label: string
  groupId: string
  deviceId: string
  constraints: MediaTrackConstraints
}

export const initialMediaStreamTrackProperties = (
  device: MediaDeviceInfoFake,
  kind: TrackKind,
  constraints: MediaTrackConstraints,
): MediaStreamTrackProperties => {
  return {
    id: uuidV4(),
    readyState: 'live',
    enabled: true,
    kind,
    label: device.label,
    groupId: device.groupId,
    deviceId: device.deviceId,
    constraints,
  }
}

export type TrackTerminatedListener = (mediaStreamTrack: MediaStreamTrackFake) => void

/**
 * The MediaStreamTrack interface represents a single media track within a stream;
 * typically, these are audio or video tracks, but other track types may exist as well.
 */
export class MediaStreamTrackFake extends EventTarget implements MediaStreamTrack {
  private readonly _onendedListener: LocalListenerPropertySync<MediaStreamTrackEventListener>
  private readonly _onmuteListener: LocalListenerPropertySync<MediaStreamTrackEventListener>
  private readonly _onunmuteListener: LocalListenerPropertySync<MediaStreamTrackEventListener>
  onTerminated: TrackTerminatedListener | null = null
  contentHint = ''

  constructor(private readonly _context: Context, private readonly _properties: MediaStreamTrackProperties) {
    super()
    this._onendedListener = new LocalListenerPropertySync<MediaStreamTrackEventListener>(this, 'ended')
    this._onmuteListener = new LocalListenerPropertySync<MediaStreamTrackEventListener>(this, 'onmute')
    this._onunmuteListener = new LocalListenerPropertySync<MediaStreamTrackEventListener>(this, 'onunmute')
  }

  deviceRemoved() {
    this.terminate()
    this.notifyEndedListeners()
  }

  permissionRevoked() {
    this.terminate()
    this.notifyEndedListeners()
  }

  /**
   * The *`enabled`* property on the MediaStreamTrack interface is a Boolean value which is `true` if the track is allowed to render the source stream or `false` if it is not.
   * This can be used to intentionally mute a track.
   * When enabled, a track's data is output from the source to the destination; otherwise, empty frames are output.
   *
   * In the case of audio, a disabled track generates frames of silence (that is, frames in which every sample's value is 0).
   * For video tracks, every frame is filled entirely with black pixels.
   *
   * The value of `enabled`, in essence, represents what a typical user would consider the muting state for a track,
   * whereas the {@link MediaStreamTrackFake.muted} property indicates a state in which the track is temporarily unable to output data,
   * such as a scenario in which frames have been lost in transit.
   */
  get enabled(): boolean {
    return this._properties.enabled
  }

  set enabled(value: boolean) {
    this._properties.enabled = value
  }

  /**
   * The *`MediaStreamTrack.id`* read-only property returns a DOMString containing a unique identifier (GUID) for the track, which is generated by the user agent.
   */
  get id(): string {
    return this._properties.id
  }

  get isolated(): boolean {
    this._context.notImplemented.call('MediaStreamTrackFake.isolated()')
    throw 'unreachable'
  }

  /**
   * Returns a DOMString set to `"audio"` if the track is an audio track and to `"video"`, if it is a video track.
   * It doesn't change if the track is deassociated from its source.
   */
  get kind(): string {
    return this._properties.kind
  }

  /**
   * Returns a DOMString containing a user agent-assigned label that identifies the track source, as in `"internal microphone"`.
   * The string may be left empty and is empty as long as no source has been connected.
   * When the track is deassociated from its source, the label is not changed.
   */
  get label(): string {
    return this._properties.label
  }

  /**
   * Returns a Boolean value indicating whether the track is unable to provide media data due to a technical issue.
   * https://w3c.github.io/mediacapture-main/#track-muted
   */
  get muted(): boolean {
    return false
  }

  /**
   * The MediaStreamTrack.readyState read-only property returns an enumerated value giving the status of the track.
   */
  get readyState(): MediaStreamTrackState {
    return this._properties.readyState
  }

  set onended(listener: MediaStreamTrackEventListener | null) {
    this._onendedListener.set(listener)
  }

  get onended(): MediaStreamTrackEventListener | null {
    return this._onendedListener.get()
  }

  set onmute(listener: MediaStreamTrackEventListener | null) {
    this._onmuteListener.set(listener)
  }

  get onmute(): MediaStreamTrackEventListener | null {
    return this._onmuteListener.get()
  }

  set onunmute(listener: MediaStreamTrackEventListener | null) {
    this._onunmuteListener.set(listener)
  }

  get onunmute(): MediaStreamTrackEventListener | null {
    return this._onunmuteListener.get()
  }

  /**
   * The applyConstraints() method of the MediaStreamTrack interface applies a set of constraints to the track;
   * these constraints let the Web site or app establish ideal values and acceptable ranges of values for the constrainable
   * properties of the track, such as frame rate, dimensions, echo cancelation, and so forth.
   *
   * Constraints can be used to ensure that the media meets certain guidelines you prefer.
   * For example, you may prefer high-density video but require that the frame rate be a little low to help keep the data rate low enough not overtax the network.
   * Constraints can also specify ideal and/or acceptable sizes or ranges of sizes.
   *
   * @param constraints
   */
  applyConstraints(constraints?: MediaTrackConstraints): Promise<void> {
    this._context.notImplemented.call('MediaStreamTrackFake.applyConstraints()')
  }

  /**
   * creates a duplicate of the MediaStreamTrack. This new MediaStreamTrack object is identical except for its unique id.
   */
  clone(): MediaStreamTrack {
    this._context.notImplemented.call('MediaStreamTrackFake.clone()')
  }

  /**
   * Returns a MediaTrackCapabilities object which specifies the values or range of values which each constrainable property, based upon the platform and user agent.
   *
   * Once you know what the browser's capabilities are, your script can use applyConstraints() to ask for the track to be configured to match ideal or acceptable settings.
   */
  getCapabilities(): MediaTrackCapabilities {
    this._context.notImplemented.call('MediaStreamTrackFake.getCapabilities()')
  }

  /**
   * returns a MediaTrackConstraints object containing the set of constraints most recently established for the track using a prior call to applyConstraints().
   * These constraints indicate values and ranges of values that the Web site or application has specified are required or acceptable for the included constrainable properties.
   *
   * Constraints can be used to ensure that the media meets certain guidelines you prefer.
   * For example, you may prefer high definition video but require that the frame rate be a little low to help keep the data rate low enough not overtax the network.
   * Constraints can also specify ideal and/or acceptable sizes or ranges of sizes.
   */
  getConstraints(): MediaTrackConstraints {
    return this._properties.constraints
  }

  /**
   * Returns a MediaTrackSettings object containing the current values of each of the constrainable properties for the current MediaStreamTrack.
   */
  getSettings(): MediaTrackSettings {
    const shared = {
      deviceId: this._properties.deviceId,
      groupId: this._properties.groupId,
    }
    if (this._properties.kind === 'video') {
      return {
        ...shared,
        aspectRatio: 4 / 3,
        frameRate: 30,
        resizeMode: 'none',
      }
    }
    if (this._properties.kind === 'audio') {
      return {
        ...shared,
        autoGainControl: true,
        channelCount: 1,
        echoCancellation: true,
        latency: 0.01,
        noiseSuppression: true,
        sampleRate: 48000,
        sampleSize: 16,
      }
    }
    return shared
  }

  /**
   * Calling stop() tells the user agent that the track's source—whatever that source may be, including files, network streams,
   * or a local camera or microphone—is no longer needed by the MediaStreamTrack.
   * Since multiple tracks may use the same source (for example, if two tabs are using the device's microphone), the source itself isn't necessarily immediately stopped.
   * It is instead disassociated from the track and the track object is stopped.
   * Once no media tracks are using the source, the source may actually be completely stopped.
   *
   * Immediately after calling stop(), the readyState property is set to ended.
   */
  stop(): void {
    this.terminate()
  }

  private terminate() {
    this._properties.readyState = 'ended'
    this.onTerminated?.(this)
  }

  private notifyEndedListeners() {
    this.dispatchEvent(new Event('ended'))
  }
}
