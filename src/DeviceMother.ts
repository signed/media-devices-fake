import { MediaDeviceDescription } from './MediaDeviceDescription';

export const anyDevice = (override: Partial<MediaDeviceDescription> = {}): MediaDeviceDescription => {
    return {
        deviceId: 'camera-device-id',
        groupId: 'camera-group-id',
        kind: 'videoinput',
        label: 'Acme camera (HD)',
        ...override
    };
};

export const anyCamera = (override: Partial<Omit<MediaDeviceDescription, 'kind'>> = {}): MediaDeviceDescription => {
    return anyDevice({ ...override, kind: 'videoinput' });
};

export const anyMicrophone = (override: Partial<Omit<MediaDeviceDescription, 'kind'>> = {}): MediaDeviceDescription => {
    return anyDevice({ ...override, kind: 'audioinput' });
};
