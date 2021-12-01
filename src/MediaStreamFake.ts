import { MediaStreamTrackFake } from './MediaStreamTrackFake'
import { notImplemented } from './not-implemented'

export type MediaStreamEventListener = (this: MediaStream, ev: MediaStreamTrackEvent) => any

const allowedCharacters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'
export const mediaStreamId = () => {
  let id = ''
  for (; id.length < 36; ) {
    id += allowedCharacters[(Math.random() * 60) | 0]
  }
  return id
}

export class MediaStreamFake extends EventTarget implements MediaStream {
  constructor(private readonly _id: string, private readonly mediaTracks: Array<MediaStreamTrackFake>) {
    super()
  }

  /**
   * A Boolean value that returns true if the MediaStream is active, or false otherwise.
   * A stream is considered active if at least one of its MediaStreamTracks is not in the MediaStreamTrack.ended state.
   * Once every track has ended, the stream's active property becomes false.
   */
  get active(): boolean {
    return !this.mediaTracks.every((track) => track.readyState === 'ended')
  }

  /**
   *  A {@DOMString} containing 36 characters denoting a universally unique identifier (UUID) for the object.
   */
  get id(): string {
    return this._id
  }

  get onaddtrack(): MediaStreamEventListener | null {
    throw notImplemented('get MediaStreamFake.onaddtrack')
  }

  set onaddtrack(_listener: MediaStreamEventListener | null) {
    throw notImplemented('set MediaStreamFake.onaddtrack')
  }

  get onremovetrack(): MediaStreamEventListener | null {
    throw notImplemented('get MediaStreamFake.onremovetrack')
  }

  set onremovetrack(_listener: MediaStreamEventListener | null) {
    throw notImplemented('set MediaStreamFake.onremovetrack')
  }

  /**
   * Stores a copy of the MediaStreamTrack given as argument.
   * If the track has already been added to the MediaStream object, nothing happens.
   * @param track
   */
  addTrack(track: MediaStreamTrack): void {
    throw notImplemented('MediaStreamFake.addTrack()')
  }

  /**
   * Returns a clone of the MediaStream object.
   * The clone will, however, have a unique value for {@link MediaStreamFake.id id}.
   */
  clone(): MediaStream {
    throw notImplemented('MediaStreamFake.clone()')
  }

  /**
   * Returns a list of the {@link MediaStreamTrackFake} objects stored in the {@link MediaStreamFake} object that have their kind attribute set to audio.
   * The order is not defined, and may not only vary from one browser to another, but also from one call to another.
   */
  getAudioTracks(): MediaStreamTrackFake[] {
    return this.mediaTracks.filter((track) => track.kind === 'audio')
  }

  /**
   * Returns the track whose ID corresponds to the one given in parameters, trackid.
   * If no parameter is given, or if no track with that ID does exist, it returns null.
   * If several tracks have the same ID, it returns the first one.
   * @param trackId
   */
  getTrackById(trackId: string): MediaStreamTrackFake | null {
    return this.mediaTracks.find((track) => track.id === trackId) ?? null
  }

  /**
   * Returns a list of all {@link MediaStreamTrackFake} objects stored in the MediaStream object, regardless of the value of the kind attribute.
   * The order is not defined, and may not only vary from one browser to another, but also from one call to another.
   */
  getTracks(): MediaStreamTrackFake[] {
    return [...this.mediaTracks]
  }

  /**
   * Returns a list of the {@link MediaStreamTrackFake} objects stored in the MediaStream object that have their kind attribute set to "video".
   * The order is not defined, and may not only vary from one browser to another, but also from one call to another.
   */
  getVideoTracks(): MediaStreamTrackFake[] {
    return this.mediaTracks.filter((track) => track.kind === 'video')
  }

  /**
   * Removes the {@link MediaStreamTrackFake} given as argument.
   * If the track is not part of the MediaStream object, nothing happens.
   * @param toRemove
   */
  removeTrack(toRemove: MediaStreamTrack): void {
    const index = this.mediaTracks.findIndex((track) => track === toRemove)
    if (index === -1) {
      return
    }
    this.mediaTracks.splice(index, 1)
  }
}
