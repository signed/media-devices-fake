import 'jest-extended';
import './matchers/dom-exception';
import './matchers/to-be-uuid';
import './matchers/to-include-video-track';
import { MediaDeviceDescription } from './MediaDeviceDescription';
import { MediaDevicesFake } from './MediaDevicesFake';
import { allConstraintsFalse, noDeviceWithDeviceId, passUndefined, requestedDeviceTypeNotAttached, Scenario } from './Scenarios';
import { allPermissionsGranted, stillHaveToAskForDeviceAccess } from './UserConsentTracker';

// this looks interesting
// https://github.com/fippo/dynamic-getUserMedia/blob/master/content.js
const anyDevice = (override: Partial<MediaDeviceDescription> = {}): MediaDeviceDescription => {
    return {
        deviceId: 'camera-device-id',
        groupId: 'camera-group-id',
        kind: 'videoinput',
        label: 'Acme camera (HD)',
        ...override
    };
};

const anyCamera = (override: Partial<Omit<MediaDeviceDescription, 'kind'>> = {}): MediaDeviceDescription => {
    return anyDevice({ ...override, kind: 'videoinput' });
};

const anyMicrophone = (override: Partial<Omit<MediaDeviceDescription, 'kind'>> = {}): MediaDeviceDescription => {
    return anyDevice({ ...override, kind: 'audioinput' });
};

const runAndReport = async (fake: MediaDevicesFake, scenario: Scenario) => {
    const stream = fake.getUserMedia(scenario.constraints);
    const checks = scenario.expected.granted?.checks ?? [];
    const results = await Promise.all(checks.map(async check => {
        return {
            what: check.what,
            details: await check.predicate(stream)
        };
    }));

    return results.filter(check => !check.details.success)
        .map((failed) => {
            const lines = [];
            lines.push('check: ' + failed.what);
            const messages = failed.details.messages ?? ['no message'];
            messages.map(message => ` - ${message}`).forEach(line => lines.push(line));
            return lines.join('\n');
        }).join('\n');
};

describe('attach device', () => {
    let fake: MediaDevicesFake;
    beforeEach(() => {
        fake = new MediaDevicesFake(allPermissionsGranted());
    });

    describe('attach', () => {
        test('inform the listeners', () => {
            const ondevicechange = jest.fn();
            const eventListener = jest.fn();

            fake.ondevicechange = ondevicechange;
            fake.addEventListener('devicechange', eventListener);
            fake.attach(anyDevice());
            expect(ondevicechange).toHaveBeenCalled();
            expect(eventListener).toHaveBeenCalled();
        });
        test('no longer inform removed listeners', () => {
            const ondevicechange = jest.fn();
            const eventListener = jest.fn();

            fake.ondevicechange = ondevicechange;
            fake.addEventListener('devicechange', eventListener);

            fake.ondevicechange = null;
            fake.removeEventListener('devicechange', eventListener);

            fake.attach(anyDevice());
            expect(ondevicechange).not.toHaveBeenCalled();
            expect(eventListener).not.toHaveBeenCalled();
        });
        test('enumerate devices lists attached device', () => {
            const device = anyDevice({
                kind: 'audioinput',
                label: 'device label',
                groupId: 'the group id',
                deviceId: 'the device id'
            });
            fake.attach(device);
            return fake.enumerateDevices().then((devices) => {
                expect(devices).toHaveLength(1);
                const deviceInfo = devices[0];
                expect(deviceInfo.kind).toBe('audioinput');
                expect(deviceInfo.label).toBe('device label');
                expect(deviceInfo.groupId).toBe('the group id');
                expect(deviceInfo.deviceId).toBe('the device id');
            });
        });
        test('rejects adding two devices with the same groupId:deviceId', () => {
            const one = anyDevice({ groupId: 'group id', deviceId: 'device id' });
            const two = anyDevice({ groupId: 'group id', deviceId: 'device id' });
            fake.attach(one);
            expect(() => fake.attach(two)).toThrow();
        });
    });

    describe('remove', () => {
        test('inform the listeners', () => {
            const ondevicechange = jest.fn();
            const eventListener = jest.fn();

            const device = anyDevice();
            fake.attach(device);
            fake.ondevicechange = ondevicechange;
            fake.addEventListener('devicechange', eventListener);

            fake.remove(device);

            expect(ondevicechange).toHaveBeenCalled();
            expect(eventListener).toHaveBeenCalled();
        });
        test('enumerate devices no longer lists the device', () => {
            const device = anyDevice();
            fake.attach(device);
            fake.remove(device);
            return fake.enumerateDevices()
                .then(devices => expect(devices).toHaveLength(0));
        });
    });

    describe('getUserMedia', () => {
        describe('no constraints', () => {
            test('returns type error', () => {
                const stream = fake.getUserMedia();
                return expect(stream).rejects.toThrow(new TypeError(`Failed to execute 'getUserMedia' on 'MediaDevices': At least one of audio and video must be requested`));
            });
            test('scenario', async () => {
                expect(await runAndReport(fake, passUndefined)).toBe('');
            });
        });

        describe('all passed constraints are false', () => {
            test('returns type error', () => {
                const stream = fake.getUserMedia(allConstraintsFalse.constraints);
                return expect(stream).rejects.toThrow(new TypeError(`Failed to execute 'getUserMedia' on 'MediaDevices': At least one of audio and video must be requested`));
            });
            test('scenario', async () => {
                expect(await runAndReport(fake, allConstraintsFalse)).toBe('');
            });
        });

        describe('not device of this type is attached', () => {
            test('return a DOMException', async () => {
                const stream = fake.getUserMedia(requestedDeviceTypeNotAttached.constraints);
                await expect(stream).rejects.domException(`Requested device not found`, 'NotFoundError');
            });
            test('scenario', async () => {
                expect(await runAndReport(fake, requestedDeviceTypeNotAttached)).toBe('');
            });
        });

        test('not passing video and audio property results in type error with message', () => {
            const stream = fake.getUserMedia({});
            return expect(stream).rejects.toThrow(new TypeError(`Failed to execute 'getUserMedia' on 'MediaDevices': At least one of audio and video must be requested`));
        });

        describe('reject promise in case no videoinput device is attached', () => {
            test('reject promise in case no videoinput device is attached', () => {
                fake.noDevicesAttached();
                const stream = fake.getUserMedia(requestedDeviceTypeNotAttached.constraints);
                return expect(stream).rejects.toThrow(new DOMException('Requested device not found'));
            });
            test('scenario', async () => {
                fake.noDevicesAttached();
                expect(await runAndReport(fake, requestedDeviceTypeNotAttached)).toBe('');
            });
        });

        test('return track for an attached camera', async () => {
            fake.attach(anyCamera());
            const stream = await fake.getUserMedia({ video: true });

            expect(stream).toIncludeVideoTrack();
        });

        describe('return another device of the same kind in case no device with the given id is attached', () => {
            test('scenario', async () => {
                fake.attach(anyCamera({ deviceId: 'actually connected' }));
                expect(await runAndReport(fake, noDeviceWithDeviceId)).toBe('');
            });
        });

        test('return videoinput with matching device id', async () => {
            fake.attach(anyCamera({ deviceId: 'not this one' }));
            fake.attach(anyCamera({ deviceId: 'attached', label: 'match' }));
            fake.attach(anyCamera({ deviceId: 'nope' }));
            const stream = await fake.getUserMedia({ video: { deviceId: 'attached' } });
            expect(stream).toBeDefined();
            expect(stream.getTracks()).toHaveLength(1);
            const track = stream.getVideoTracks()[0];
            expect(track.label).toBe('match');
            expect(track.id).toBeUuid();
            expect(track.enabled).toBe(true);
            expect(track.readyState).toBe('live');
            expect(track.kind).toBe('video');
        });
        test('return audioinput with matching device id', async () => {
            fake.attach(anyMicrophone({ deviceId: 'not this one' }));
            fake.attach(anyMicrophone({ deviceId: 'attached', label: 'match' }));
            fake.attach(anyMicrophone({ deviceId: 'nope' }));
            const stream = await fake.getUserMedia({ audio: { deviceId: 'attached' } });
            expect(stream).toBeDefined();
            expect(stream.getTracks()).toHaveLength(1);
            const track = stream.getAudioTracks()[0];
            expect(track.label).toBe('match');
            expect(track.id).toBeUuid();
            expect(track.enabled).toBe(true);
            expect(track.readyState).toBe('live');
            expect(track.kind).toBe('audio');
        });
    });
});

describe('enumerateDevices', () => {
    describe('still have to ask for device access', () => {
        test('label and deviceId in MediaDeviceInfo is set to empty string', async () => {
            const fake = new MediaDevicesFake(stillHaveToAskForDeviceAccess());
            fake.attach(anyMicrophone({ label: 'The microphone', deviceId: 'microphone identifier' }));
            const devices = await fake.enumerateDevices();
            const microphone = devices[0];
            expect(microphone.label).toEqual('');
            expect(microphone.deviceId).toEqual('');
        });
    });
});
