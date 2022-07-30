import type { MediaDeviceDescription } from './MediaDeviceDescription.js'

export const anyDevice = (override: Partial<MediaDeviceDescription> = {}): MediaDeviceDescription => {
  return {
    deviceId: 'stand-in-device-id',
    groupId: 'stand-in-group-id',
    kind: 'videoinput',
    label: 'Acme Device (HD)',
    ...override,
  }
}

export const anyCamera = (override: Partial<Omit<MediaDeviceDescription, 'kind'>> = {}): MediaDeviceDescription => {
  return anyDevice({ ...override, kind: 'videoinput' })
}

export const anyMicrophone = (override: Partial<Omit<MediaDeviceDescription, 'kind'>> = {}): MediaDeviceDescription => {
  return anyDevice({ ...override, kind: 'audioinput' })
}

export const anySpeaker = (override: Partial<Omit<MediaDeviceDescription, 'kind'>> = {}): MediaDeviceDescription => {
  return anyDevice({ ...override, kind: 'audiooutput' })
}
