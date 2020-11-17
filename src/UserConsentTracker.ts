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

export enum PermissionState {
    Ask = 'Ask',
    Allowed = 'Allowed',
    Blocked = 'Blocked',
}

export type UserConsent = {
    camera: PermissionState
    microphone: PermissionState
}

const resultingPermissionStateFor = (action: PermissionPromptAction): PermissionState => {
    if (action === PermissionPromptAction.Allow) {
        return PermissionState.Allowed;
    }
    if (action === PermissionPromptAction.Block) {
        return PermissionState.Blocked;
    }
    throw notImplemented(`action: ${action}`);
};

export class UserConsentTracker {
    private _pendingPermissionRequest: void | PermissionRequest = undefined;

    constructor(readonly _userConsent: UserConsent) {
    }

    requestPermissionFor(permissionRequest: PermissionRequest) {
        if (this._pendingPermissionRequest) {
            throw notImplemented('There is already a pending permission request, not sure if this can happen');
        }
        if (this.permissionGrantedFor(permissionRequest.deviceKind)) {
            permissionRequest.granted();
            return;
        }
        if (this.permissionBlockedFor(permissionRequest.deviceKind)) {
            permissionRequest.blocked();
            return;
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

    private permissionBlockedFor(deviceKind: MediaDeviceKind) {
        if (deviceKind === 'videoinput') {
            return this._userConsent.camera === PermissionState.Blocked;
        }
        if (deviceKind === 'audioinput') {
            return this._userConsent.microphone === PermissionState.Blocked;
        }
        throw notImplemented(`permissionGrantedFor '${deviceKind}'`);
    }


    async deviceAccessPrompt(): Promise<PermissionPrompt> {
        //TODO active poll for some time and reject delayed
        if (this._pendingPermissionRequest) {
            const complete = (action: PermissionPromptAction): void => {
                if (this._pendingPermissionRequest === undefined) {
                    throw new Error('there is no pending permission request');
                }
                if (this._pendingPermissionRequest.deviceKind === 'audioinput') {
                    this._userConsent.microphone = resultingPermissionStateFor(action);
                }
                if (this._pendingPermissionRequest.deviceKind === 'videoinput') {
                    this._userConsent.camera = resultingPermissionStateFor(action);
                }
                this._pendingPermissionRequest = undefined;
            };
            return Promise.resolve(this.permissionPromptFor(this._pendingPermissionRequest, complete));
        }
        return Promise.reject('Nobody asked for device access');
    }

    private permissionPromptFor(permissionRequest: PermissionRequest, complete: (action: PermissionPromptAction) => void) {
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
                complete(action);
                if (action === PermissionPromptAction.Allow) {
                    permissionRequest.granted();
                    return;
                }
                if (action === PermissionPromptAction.Block) {
                    permissionRequest.blocked();
                    return;
                }
                throw notImplemented(`takeAction '${action}'`);
            }
        }();
    }

    accessAllowedFor(kind: MediaDeviceKind):boolean {
        if (kind === 'audioinput') {
            return this._userConsent.microphone === PermissionState.Allowed
        }
        if (kind === 'videoinput') {
            return this._userConsent.camera === PermissionState.Allowed;
        }
        throw notImplemented(`not sure how to implement this for ${kind}`);
    }
}

