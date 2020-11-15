import { Deferred } from './Deffered';
import { MediaDeviceDescription } from './MediaDeviceDescription';
import { MediaDeviceInfoFake } from './MediaDeviceInfoFake';
import { MediaStreamFake, mediaStreamId } from './MediaStreamFake';
import { initialMediaStreamTrackProperties, MediaStreamTrackFake, TrackKind } from './MediaStreamTrackFake';
import { notImplemented } from './not-implemented';
import { UserConsentTracker } from './UserConsentTracker';

type DeviceChangeListener = (this: MediaDevices, ev: Event) => any

const deviceMatching = (description: MediaDeviceDescription) => (device: MediaDeviceInfoFake) => device.deviceId === description.deviceId && device.groupId === description.groupId;

const toMediaDeviceDescription = (device: MediaDeviceInfoFake): MediaDeviceDescription => ({ deviceId: device.deviceId, groupId: device.groupId, label: device.label, kind: device.kind });

const positiveNumericNonRequiredConstraint = ['height', 'width', 'frameRate', 'aspectRatio', 'sampleRate'] as const;
type PositiveNumericNonRequiredConstraintName = typeof positiveNumericNonRequiredConstraint[number];
const _fit = (actual: number, ideal: number): number => (actual == ideal) ? 0 : Math.abs(actual - ideal) / Math.max(Math.abs(actual), Math.abs(ideal));

const stringEnumNonRequiredConstraint = ['deviceId', 'groupId', 'facingMode', 'resizeMode', 'echoCancellation'];

type StringEnumNonRequiredConstraintName = typeof stringEnumNonRequiredConstraint[number]
const fit2 = (actual: string, ideal: string): number => (actual === ideal) ? 0 : 1;

type ConstraintName = PositiveNumericNonRequiredConstraintName | StringEnumNonRequiredConstraintName;

type Constraint = (device: MediaDeviceInfoFake) => number

class ConstrainSet {
    private readonly constraints: Constraint[] = [];

    constructor(requested: boolean | MediaTrackConstraints) {
        if (typeof requested === 'boolean') {
            return;
        }
        const passedProperties = Object.getOwnPropertyNames(requested);
        const implementedProperties: (keyof MediaTrackConstraintSet) [] = ['deviceId'];
        const unsupported = passedProperties.filter(arg => !implementedProperties.some(im => im === arg));
        if (unsupported.length) {
            throw notImplemented(`constraint not implemented ${unsupported}`);
        }
        const deviceId = requested.deviceId;
        if (deviceId !== undefined) {
            if (typeof deviceId !== 'string') {
                throw notImplemented('only basic deviceId of type string is supported at the moment');
            }
            this.constraints.push((device: MediaDeviceInfoFake) => {
                return fit2(device.deviceId, deviceId);
            });
        }

    }

    fitnessDistanceFor(device: MediaDeviceInfoFake): number {
        return this.constraints.reduce((acc, curr) => acc + curr(device), 0);
    }
}

const selectSettings = (mediaTrackConstraints: MediaTrackConstraints | boolean, devices: MediaDeviceInfoFake[]): MediaDeviceInfoFake | void => {
    const constraintSet = new ConstrainSet(mediaTrackConstraints);
    const viableDevice = devices.map((device) => {
        return {
            device,
            fitness: constraintSet.fitnessDistanceFor(device)
        };
    }).filter((scoredDevice) => scoredDevice.fitness !== Infinity);
    viableDevice.sort((a, b) => a.fitness - b.fitness);
    return viableDevice[0].device;
};

const trackConstraintsFrom = (constraints: MediaStreamConstraints): { mediaTrackConstraints: boolean | MediaTrackConstraints, trackKind: TrackKind, deviceKind: MediaDeviceKind } => {
    if (constraints.video) {
        const mediaTrackConstraints = constraints.video;
        const trackKind = 'video';
        const deviceKind = 'videoinput';
        return {
            mediaTrackConstraints,
            trackKind,
            deviceKind
        };
    }
    if (constraints.audio) {
        const mediaTrackConstraints = constraints.audio;
        const trackKind = 'audio';
        const deviceKind = 'audioinput';
        return {
            mediaTrackConstraints,
            trackKind,
            deviceKind
        };
    }

    throw new Error('with the current assumptions this should not happen');

};

const tryToOpenAStreamFor = (deferred: Deferred<MediaStream>, deviceKind: MediaDeviceKind, trackKind: TrackKind, mediaTrackConstraints: boolean | MediaTrackConstraints, allDevices: MediaDeviceInfoFake[]): void => {
    const devices = allDevices.filter(device => device.kind === deviceKind);
    if (devices.length === 0) {
        deferred.reject(new DOMException('Requested device not found', 'NotFoundError'));
        return;
    }
    const selectedDevice = selectSettings(mediaTrackConstraints, devices);
    if (selectedDevice === undefined) {
        throw notImplemented('should this be an over constrained error?');
    }

    const mediaTrack = new MediaStreamTrackFake(initialMediaStreamTrackProperties(selectedDevice.label, trackKind));
    const mediaTracks = [mediaTrack];
    const mediaStream = new MediaStreamFake(mediaStreamId(), mediaTracks);

    deferred.resolve(mediaStream);
};

export class MediaDevicesFake implements MediaDevices {
    private readonly deviceChangeListeners: DeviceChangeListener [] = [];
    private readonly devices: MediaDeviceInfoFake [] = [];
    private readonly _userConsentTracker = new UserConsentTracker();
    private _onDeviceChangeListener: DeviceChangeListener | null = null;

    constructor(userConsentTracker: UserConsentTracker) {
        this._userConsentTracker = userConsentTracker;
    }


    get ondevicechange(): DeviceChangeListener | null {
        return this._onDeviceChangeListener;
    }

    set ondevicechange(listener: DeviceChangeListener | null) {
        this._onDeviceChangeListener = listener;
    }

    addEventListener<K extends keyof MediaDevicesEventMap>(type: K, listener: (this: MediaDevices, ev: MediaDevicesEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: any, listener: any, options?: boolean | AddEventListenerOptions): void {
        if (options) {
            throw notImplemented();
        }
        if (type !== 'devicechange') {
            throw notImplemented();
        }
        this.deviceChangeListeners.push(listener);
    }

    removeEventListener<K extends keyof MediaDevicesEventMap>(type: K, listener: (this: MediaDevices, ev: MediaDevicesEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean): void;
    removeEventListener(type: any, listener: any, options?: boolean | EventListenerOptions): void {
        if (options) {
            throw notImplemented();
        }
        if (type !== 'devicechange') {
            throw notImplemented();
        }
        const index = this.deviceChangeListeners.indexOf(listener);
        if (index >= 0) {
            this.deviceChangeListeners.splice(index, 1);
        }
    }

    dispatchEvent(event: Event): boolean {
        throw notImplemented();
    }

    enumerateDevices(): Promise<MediaDeviceInfo[]> {
        return Promise.resolve([...this.devices]);
    }

    getSupportedConstraints(): MediaTrackSupportedConstraints {
        throw notImplemented();
    }

    // https://w3c.github.io/mediacapture-main/#methods-5
    // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    // https://blog.addpipe.com/common-getusermedia-errors/
    getUserMedia(constraints?: MediaStreamConstraints): Promise<MediaStream> {
        if (constraints === undefined ||
            Object.keys(constraints).length === 0 ||
            (constraints.video === false && constraints.audio === false)) {
            return Promise.reject(new TypeError(`Failed to execute 'getUserMedia' on 'MediaDevices': At least one of audio and video must be requested`));
        }
        if (constraints.audio !== undefined && constraints.video !== undefined) {
            throw notImplemented('at the moment there is no support to request audio and video at the same time');
        }
        const { mediaTrackConstraints, trackKind, deviceKind } = trackConstraintsFrom(constraints);
        const deferred = new Deferred<MediaStream>();
        this._userConsentTracker.requestPermissionFor({
            deviceKind, granted: () => {
                tryToOpenAStreamFor(deferred, deviceKind, trackKind, mediaTrackConstraints, this.devices);
            }
        });

        return deferred.promise;
    }

    public noDevicesAttached() {
        this.devices.map(device => toMediaDeviceDescription(device))
            .forEach(descriptor => this.remove(descriptor));
    }

    public attach(toAdd: MediaDeviceDescription) {
        if (this.devices.some(deviceMatching(toAdd))) {
            throw notImplemented(`device with this description already attached
${JSON.stringify(toAdd, null, 2)}`);
        }
        // make a defensive copy to stop manipulation after attaching the device
        const infoDefaultFake = new MediaDeviceInfoFake({ ...toAdd });
        this.devices.push(infoDefaultFake);
        this.informDeviceChangeListener();
    }

    public remove(toRemove: MediaDeviceDescription) {
        const index = this.devices.findIndex(deviceMatching(toRemove));
        if (index >= 0) {
            this.devices.splice(index, 1);
            this.informDeviceChangeListener();
        }
    }

    private informDeviceChangeListener() {
        const event = new Event('stand-in');
        if (this._onDeviceChangeListener) {
            this._onDeviceChangeListener(event);
        }
        this.deviceChangeListeners.forEach(listener => listener.call(this, event));
    }
}
