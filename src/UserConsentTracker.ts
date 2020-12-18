import {Deferred} from './Deffered'
import {notImplemented} from './not-implemented'

export enum RequestedMediaInput {
  Microphone = 'Microphone',
  Camera = 'Camera',
}

export enum PermissionPromptAction {
  Dismiss = 'Dismiss', // permission state stays in prompt, 3rd time dismiss results in block
  Block = 'Block',
  Allow = 'Allow',
}

export interface PermissionPrompt {
  requestedPermissions(): RequestedMediaInput[]

  takeAction(action: PermissionPromptAction): void
}

export interface PermissionRequest {
  deviceKind: MediaDeviceKind
  granted: () => void
  blocked: () => void
}

export enum PermissionState {
  prompt = 'prompt',
  granted = 'granted',
  denied = 'denied',
}

export type UserConsent = {
  camera: PermissionState
  microphone: PermissionState
}

const resultingPermissionStateFor = (action: PermissionPromptAction): PermissionState => {
  if (action === PermissionPromptAction.Allow) {
    return PermissionState.granted
  }
  if (action === PermissionPromptAction.Block) {
    return PermissionState.denied
  }
  throw notImplemented(`action: ${action}`)
}

export class UserConsentTracker {
  private _pendingPermissionRequest: void | PermissionRequest = undefined

  constructor(readonly _userConsent: UserConsent) {}

  userConsentStateFor(kind: keyof UserConsent) {
    return this._userConsent[kind]
  }

  requestPermissionFor(permissionRequest: PermissionRequest) {
    if (this._pendingPermissionRequest) {
      throw notImplemented(
        'There is already a pending permission request, not sure if this can happen'
      )
    }
    if (this.permissionGrantedFor(permissionRequest.deviceKind)) {
      permissionRequest.granted()
      return
    }
    if (this.permissionBlockedFor(permissionRequest.deviceKind)) {
      permissionRequest.blocked()
      return
    }
    this._pendingPermissionRequest = permissionRequest
  }

  private permissionGrantedFor(deviceKind: MediaDeviceKind) {
    if (deviceKind === 'videoinput') {
      return this._userConsent.camera === PermissionState.granted
    }
    if (deviceKind === 'audioinput') {
      return this._userConsent.microphone === PermissionState.granted
    }
    throw notImplemented(`permissionGrantedFor '${deviceKind}'`)
  }

  private permissionBlockedFor(deviceKind: MediaDeviceKind) {
    if (deviceKind === 'videoinput') {
      return this._userConsent.camera === PermissionState.denied
    }
    if (deviceKind === 'audioinput') {
      return this._userConsent.microphone === PermissionState.denied
    }
    throw notImplemented(`permissionGrantedFor '${deviceKind}'`)
  }

  //todo add an override for the wait time and poll interval
  async deviceAccessPrompt(): Promise<PermissionPrompt> {
    const deferred = new Deferred<PermissionPrompt>()
    const maximumWaitTime = 1000
    const pollInterval = 100
    let timeWaited = 0

    let pollForPendingPermissionRequest = () => {
      if (this._pendingPermissionRequest) {
        const complete = (action: PermissionPromptAction): void => {
          if (this._pendingPermissionRequest === undefined) {
            throw new Error('there is no pending permission request')
          }
          if (this._pendingPermissionRequest.deviceKind === 'audioinput') {
            this._userConsent.microphone = resultingPermissionStateFor(action)
          }
          if (this._pendingPermissionRequest.deviceKind === 'videoinput') {
            this._userConsent.camera = resultingPermissionStateFor(action)
          }
          this._pendingPermissionRequest = undefined
        }
        const value = this.permissionPromptFor(this._pendingPermissionRequest, complete)
        deferred.resolve(value)
        return
      }
      if (timeWaited >= maximumWaitTime) {
        deferred.reject(
          new Error(
            `After waiting for ${maximumWaitTime} ms there still is no pending permission request`
          )
        )
        return
      }
      timeWaited += pollInterval
      // TODO add scheduler abstraction to encapsulate window access
      window.setTimeout(pollForPendingPermissionRequest, pollInterval)
    }
    pollForPendingPermissionRequest()

    // check with the Permission Manager if permissions where already rejected
    // check if there was a request for media
    return deferred.promise
  }

  private permissionPromptFor(
    permissionRequest: PermissionRequest,
    complete: (action: PermissionPromptAction) => void
  ) {
    const requestedPermissions: RequestedMediaInput[] = []
    if (permissionRequest.deviceKind === 'videoinput' && !this.permissionGrantedFor('videoinput')) {
      requestedPermissions.push(RequestedMediaInput.Camera)
    }
    if (permissionRequest.deviceKind === 'audioinput' && !this.permissionGrantedFor('audioinput')) {
      requestedPermissions.push(RequestedMediaInput.Microphone)
    }
    return new (class implements PermissionPrompt {
      requestedPermissions(): RequestedMediaInput[] {
        return requestedPermissions
      }

      takeAction(action: PermissionPromptAction): void {
        complete(action)
        if (action === PermissionPromptAction.Allow) {
          permissionRequest.granted()
          return
        }
        if (action === PermissionPromptAction.Block) {
          permissionRequest.blocked()
          return
        }
        throw notImplemented(`takeAction '${action}'`)
      }
    })()
  }

  accessAllowedFor(kind: MediaDeviceKind): boolean {
    if (kind === 'audioinput') {
      return this._userConsent.microphone === PermissionState.granted
    }
    if (kind === 'videoinput') {
      return this._userConsent.camera === PermissionState.granted
    }
    throw notImplemented(`not sure how to implement this for ${kind}`)
  }
}
