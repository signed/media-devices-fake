import { anyContext } from './ContextMother.js'
import { anyDevice } from './DeviceMother.js'
import { MediaDeviceInfoFake } from './MediaDeviceInfoFake.js'
import type {
  MediaStreamTrackProperties,
  TrackKind} from './MediaStreamTrackFake.js';
import {
  initialMediaStreamTrackProperties,
  MediaStreamTrackFake
} from './MediaStreamTrackFake.js'

export const anyTrackKind = (): TrackKind => 'video'

export const anyMediaStreamTrack = (overrides: Partial<MediaStreamTrackProperties> = {}) => {
  const context = anyContext()
  const deviceDescription = anyDevice({ label: 'stand in label' })
  const device = new MediaDeviceInfoFake(context, deviceDescription)
  const initial = initialMediaStreamTrackProperties(device, anyTrackKind(), {})
  const properties = { ...initial, ...overrides }
  return new MediaStreamTrackFake(context, properties)
}
