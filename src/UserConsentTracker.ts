import { Context } from './context'
import { Deferred } from './Deferred'
import { PermissionStatusFake } from './permissions/PermissionStatusFake'

export enum RequestedMediaInput {
  Microphone = 'Microphone',
  Camera = 'Camera',
}

export type PermissionPromptAction = 'dismiss' | 'allow' | 'block'

export interface PermissionPrompt {
  requestedPermissions(): RequestedMediaInput[]

  takeAction(action: PermissionPromptAction): void
}

export interface PermissionRequest {
  deviceKind: MediaDeviceKind
  granted: () => void
  blocked: () => void
}

export type UserConsent = {
  camera: PermissionState
  microphone: PermissionState
}

const resultingPermissionStateFor = (context: Context, action: PermissionPromptAction): PermissionState => {
  if (action === 'allow') {
    return 'granted'
  }
  if (action === 'block') {
    return 'denied'
  }
  context.notImplemented.call(`resultingPermissionStateFor() action: ${action}`)
}

export class UserConsentTracker {
  private readonly _trackedPermissionStatus: Record<keyof UserConsent, PermissionStatusFake[]> = {
    camera: [],
    microphone: [],
  }
  private _pendingPermissionRequest: void | PermissionRequest = undefined

  constructor(private readonly _context: Context, private readonly _userConsent: UserConsent) {}

  permissionStatusFor(kind: keyof UserConsent) {
    const permissionState = this.permissionStateFor(kind)
    const permissionStatus = new PermissionStatusFake(permissionState)
    this._trackedPermissionStatus[kind].push(permissionStatus)
    return permissionStatus
  }

  setPermissionFor(kind: keyof UserConsent, state: PermissionState) {
    this._userConsent[kind] = state
    this._trackedPermissionStatus[kind].forEach((permissionStatus) => permissionStatus.updateTo(state))
  }

  requestPermissionFor(permissionRequest: PermissionRequest) {
    if (this._pendingPermissionRequest) {
      this._context.notImplemented.call('There is already a pending permission request, not sure if this can happen')
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

  private permissionStateFor(kind: 'camera' | 'microphone') {
    return this._userConsent[kind]
  }

  private permissionGrantedFor(deviceKind: MediaDeviceKind) {
    if (deviceKind === 'videoinput') {
      return this._userConsent.camera === 'granted'
    }
    if (deviceKind === 'audioinput') {
      return this._userConsent.microphone === 'granted'
    }
    this._context.notImplemented.call(`permissionGrantedFor '${deviceKind}'`)
  }

  private permissionBlockedFor(deviceKind: MediaDeviceKind) {
    if (deviceKind === 'videoinput') {
      return this._userConsent.camera === 'denied'
    }
    if (deviceKind === 'audioinput') {
      return this._userConsent.microphone === 'denied'
    }
    this._context.notImplemented.call(`permissionGrantedFor '${deviceKind}'`)
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
          const updatedPermission = resultingPermissionStateFor(this._context, action)
          if (this._pendingPermissionRequest.deviceKind === 'audioinput') {
            this._userConsent.microphone = updatedPermission
            this._trackedPermissionStatus.microphone.forEach((fake) => fake.updateTo(updatedPermission))
          }
          if (this._pendingPermissionRequest.deviceKind === 'videoinput') {
            this._userConsent.camera = updatedPermission
            this._trackedPermissionStatus.camera.forEach((fake) => fake.updateTo(updatedPermission))
          }
          this._pendingPermissionRequest = undefined
        }
        const value = this.permissionPromptFor(this._context, this._pendingPermissionRequest, complete)
        deferred.resolve(value)
        return
      }
      if (timeWaited >= maximumWaitTime) {
        deferred.reject(
          new Error(`After waiting for ${maximumWaitTime} ms there still is no pending permission request`),
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
    context: Context,
    permissionRequest: PermissionRequest,
    complete: (action: PermissionPromptAction) => void,
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
        if (action === 'allow') {
          permissionRequest.granted()
          return
        }
        if (action === 'block') {
          permissionRequest.blocked()
          return
        }
        context.notImplemented.call(`takeAction '${action}'`)
      }
    })()
  }

  accessAllowedFor(kind: MediaDeviceKind): boolean {
    if (kind === 'audioinput') {
      return this._userConsent.microphone === 'granted'
    }
    if (kind === 'videoinput') {
      return this._userConsent.camera === 'granted'
    }
    if (kind === 'audiooutput') {
      return this._userConsent.microphone === 'granted'
    }
    this._context.notImplemented.call(`not sure how to implement this for ${kind}`)
  }
}
