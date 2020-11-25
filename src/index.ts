export { MediaDevicesFake } from './MediaDevicesFake';
export { MediaDeviceDescription } from './MediaDeviceDescription';
export { anyMicrophone, anyCamera, anyDevice } from './DeviceMother';
export { PermissionPrompt, PermissionPromptAction, RequestedMediaInput } from './UserConsentTracker';
import { MediaDevicesFake } from './MediaDevicesFake';
import { PermissionPrompt, PermissionState, UserConsent, UserConsentTracker } from './UserConsentTracker';
import { MediaDeviceDescription } from './MediaDeviceDescription';

export type InitialSetup = {
    attachedDevices?: MediaDeviceDescription[];
    microphone?: PermissionState;
    camera?: PermissionState;
}

export interface MediaDevicesControl {
    mediaDevices: MediaDevices;

    attach(toAdd: MediaDeviceDescription): void

    remove(toRemove: MediaDeviceDescription): void

    deviceAccessPrompt(): Promise<PermissionPrompt>;
}

export const forgeMediaDevices = (initial: InitialSetup = {}): MediaDevicesControl => {
    const attachedDevices = initial.attachedDevices ?? [];
    const camera = initial.camera ?? PermissionState.Ask;
    const microphone = initial.microphone = PermissionState.Ask;
    const consent: UserConsent = { camera, microphone };
    const consentTracker = new UserConsentTracker(consent);
    const mediaDevicesFake = new MediaDevicesFake(consentTracker);
    attachedDevices.forEach(device => mediaDevicesFake.attach(device));

    return new class implements MediaDevicesControl {
        get mediaDevices(): MediaDevices {
            return mediaDevicesFake;
        };

        attach(toAdd: MediaDeviceDescription): void {
            mediaDevicesFake.attach(toAdd);
        }

        remove(toRemove: MediaDeviceDescription): void {
            mediaDevicesFake.remove(toRemove);
        }

        deviceAccessPrompt(): Promise<PermissionPrompt> {
            return consentTracker.deviceAccessPrompt();
        }
    };
};


// todo testrig should be moved here
export { MediaStreamCheckResult, Scenario } from './Scenarios';
import { scenarios as all, passUndefined, existingDevice, allConstraintsFalse, requestedDeviceTypeNotAttached, noDeviceWithDeviceId } from './Scenarios';

export const scenarios = {
    all,
    passUndefined,
    existingDevice,
    allConstraintsFalse,
    requestedDeviceTypeNotAttached,
    noDeviceWithDeviceId
};
