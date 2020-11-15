import { notImplemented } from './not-implemented';


export const allPermissionsGranted = () => {
    return new UserConsentTracker({
        camera: PermissionState.Allowed,
        microphone: PermissionState.Allowed
    });
};

export const stillHaveToAskForDeviceAccess = () => {
    return new UserConsentTracker({
        camera: PermissionState.Ask,
        microphone: PermissionState.Ask
    });
};

export enum RequestedMediaInput {
    Microphone = 'Microphone',
    Camera = 'Camera'
}

export enum PermissionPromptAction {
    Dismiss = 'Dismiss', // permission state stays in Ask, 3rd time dismiss results in block
    Block = 'Block',
    Allow = 'Allow'
}

export interface PermissionPrompt {
    requestedPermissions(): RequestedMediaInput[];

    takeAction(action: PermissionPromptAction): void;
}

export interface PermissionRequest {
    deviceKind: MediaDeviceKind
    granted: () => void
    blocked: () => void;
}


enum PermissionState {
    Ask = 'Ask',
    Allowed = 'Allowed',
    Blocked = 'Blocked',
}

export type UserConsent = {
    camera: PermissionState
    microphone: PermissionState
}

export class UserConsentTracker {
    private _pendingPermissionRequest: void | PermissionRequest = undefined;

    constructor(readonly _userConsent: UserConsent) {
    }

    requestPermissionFor(permissionRequest: PermissionRequest) {
        if (this.permissionGrantedFor(permissionRequest.deviceKind)) {
            permissionRequest.granted();
            return;
        }
        if (this._pendingPermissionRequest) {
            throw notImplemented('There is already a pending permission request');
        }
        this._pendingPermissionRequest = permissionRequest;
    }

    private permissionGrantedFor(deviceKind: MediaDeviceKind) {
        if (deviceKind === 'videoinput') {
            return this._userConsent.camera === PermissionState.Allowed;
        }
        if (deviceKind === 'audioinput') {
            return this._userConsent.microphone === PermissionState.Allowed;
        }
        throw notImplemented(`permissionGrantedFor '${deviceKind}'`);
    }

    async deviceAccessPrompt(): Promise<PermissionPrompt> {
        if (this._pendingPermissionRequest) {
            const complete = () => this._pendingPermissionRequest = undefined;
            return Promise.resolve(this.permissionPromptFor(this._pendingPermissionRequest, complete));
        }
        return Promise.reject('Nobody asked for device access');
    }

    private permissionPromptFor(permissionRequest: PermissionRequest, complete: () => undefined) {
        const requestedPermissions: RequestedMediaInput[] = [];
        if (permissionRequest.deviceKind === 'videoinput' && !this.permissionGrantedFor('videoinput')) {
            requestedPermissions.push(RequestedMediaInput.Camera);
        }
        if (permissionRequest.deviceKind === 'audioinput' && !this.permissionGrantedFor('audiooutput')) {
            requestedPermissions.push(RequestedMediaInput.Microphone);
        }
        return new class implements PermissionPrompt {
            requestedPermissions(): RequestedMediaInput[] {
                return requestedPermissions;
            }

            takeAction(action: PermissionPromptAction): void {
                complete();
                if (action === PermissionPromptAction.Allow) {
                    permissionRequest.granted()
                    return
                }
                if (action === PermissionPromptAction.Block) {
                    permissionRequest.blocked()
                    return
                }
                throw notImplemented(`takeAction '${action}'`);
            }
        }();
    }
}

