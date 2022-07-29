import { anyContext } from './ContextMother'
import { anyDevice } from './DeviceMother'
import { MediaDeviceInfoFake } from './MediaDeviceInfoFake'
import {
  initialMediaStreamTrackProperties,
  MediaStreamTrackFake,
  MediaStreamTrackProperties,
  TrackKind,
} from './MediaStreamTrackFake'

export const anyTrackKind = (): TrackKind => 'video'

export const anyMediaStreamTrack = (overrides: Partial<MediaStreamTrackProperties> = {}) => {
  const context = anyContext()
  const deviceDescription = anyDevice({ label: 'stand in label' })
  const device = new MediaDeviceInfoFake(context, deviceDescription)
  const initial = initialMediaStreamTrackProperties(device, anyTrackKind(), {})
  const properties = { ...initial, ...overrides }
  return new MediaStreamTrackFake(context, properties)
}
