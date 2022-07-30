import type { Context } from './context.js'
import { Deferred } from './Deferred.js'
import { PermissionStatusFake } from './permissions/PermissionStatusFake.js'

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
  dismissed: () => void
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

type Poll = () => void

export class UserConsentTracker {
  private readonly _trackedPermissionStatus: Record<keyof UserConsent, PermissionStatusFake[]> = {
    camera: [],
    microphone: [],
  }
  private _pendingPermissionRequests: PermissionRequest[] = []
  private _deviceAccessPromptPollQueue: Poll[] = []

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
    if (this.permissionGrantedFor(permissionRequest.deviceKind)) {
      permissionRequest.granted()
      return
    }
    if (this.permissionBlockedFor(permissionRequest.deviceKind)) {
      permissionRequest.blocked()
      return
    }
    this._pendingPermissionRequests.push(permissionRequest)
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

    const pollForPendingPermissionRequest = () => {
      if (this._pendingPermissionRequests.length > 0) {
        const complete = (action: PermissionPromptAction): void => {
          const pendingPermissionRequest = this._pendingPermissionRequests.shift()
          if (pendingPermissionRequest === undefined) {
            throw new Error('there is no pending permission request')
          }
          if (action === 'dismiss') {
            //todo 3rd dismiss means blocked
            //not sure if this has to be handled here
            return
          }
          const updatedPermission = resultingPermissionStateFor(this._context, action)
          if (pendingPermissionRequest.deviceKind === 'audioinput') {
            this._userConsent.microphone = updatedPermission
            this._trackedPermissionStatus.microphone.forEach((fake) => fake.updateTo(updatedPermission))
          }
          if (pendingPermissionRequest.deviceKind === 'videoinput') {
            this._userConsent.camera = updatedPermission
            this._trackedPermissionStatus.camera.forEach((fake) => fake.updateTo(updatedPermission))
          }
          this.tryToClosePendingPermissionRequests()
        }
        const value = this.permissionPromptFor(this._context, this._pendingPermissionRequests[0], complete)
        deferred.resolve(value)
        this.currentPollCompleted()
        return
      }
      if (timeWaited >= maximumWaitTime) {
        deferred.reject(
          new Error(`After waiting for ${maximumWaitTime} ms there still is no pending permission request`),
        )
        this.currentPollCompleted()
        return
      }
      timeWaited += pollInterval
      // TODO add scheduler abstraction to encapsulate window access
      window.setTimeout(pollForPendingPermissionRequest, pollInterval)
    }
    this._deviceAccessPromptPollQueue.push(pollForPendingPermissionRequest)
    if (this._deviceAccessPromptPollQueue.length === 1) {
      pollForPendingPermissionRequest()
    }

    // check with the Permission Manager if permissions where already rejected
    // check if there was a request for media
    return deferred.promise
  }

  private currentPollCompleted() {
    this.removeCurrentPoll()
    this.startNextPoll()
  }

  private tryToClosePendingPermissionRequests() {
    while (this._pendingPermissionRequests.length > 0) {
      const permissionRequest = this._pendingPermissionRequests[0]
      if (permissionRequest.deviceKind === 'videoinput') {
        switch (this._userConsent.camera) {
          case 'prompt':
            return
          case 'denied':
            this._pendingPermissionRequests.shift()
            permissionRequest.blocked()
            break
          case 'granted':
            this._pendingPermissionRequests.shift()
            permissionRequest.granted()
            break
        }
      }
      if (permissionRequest.deviceKind === 'audioinput') {
        switch (this._userConsent.microphone) {
          case 'prompt':
            return
          case 'denied':
            this._pendingPermissionRequests.shift()
            permissionRequest.blocked()
            break
          case 'granted':
            this._pendingPermissionRequests.shift()
            permissionRequest.granted()
            break
        }
      }
    }
  }

  private startNextPoll() {
    const nextPoll = this._deviceAccessPromptPollQueue[0]
    if (nextPoll) {
      nextPoll()
    }
  }

  private removeCurrentPoll() {
    this._deviceAccessPromptPollQueue.shift()
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
        if (action === 'dismiss') {
          //todo 3rd dismiss means blocked
          permissionRequest.dismissed()
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
