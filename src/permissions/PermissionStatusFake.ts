import {notImplemented} from '../not-implemented'

type OnChangeListener = (this: PermissionStatus, ev: Event) => any

export class PermissionStatusFake implements PermissionStatus {
  private readonly changeListeners: OnChangeListener[] = []
  private _changeListener: OnChangeListener | null = null

  constructor(private _state: PermissionState) {}

  get state(): PermissionState {
    return this._state
  }

  updateTo(updatedPermission: PermissionState) {
    if (this._state === updatedPermission) {
      return
    }
    this._state = updatedPermission
    this._changeListener?.call(this, new Event('do not know yet'))
    this.changeListeners.forEach((listener) => listener.call(this, new Event('do not know yet')))
  }

  set onchange(listener: OnChangeListener | null) {
    this._changeListener = listener
  }

  get onchange(): OnChangeListener | null {
    return this._changeListener
  }

  addEventListener<K extends keyof PermissionStatusEventMap>(
    type: K,
    listener: (this: PermissionStatus, ev: PermissionStatusEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ): void
  addEventListener(type: any, listener: any, options?: boolean | AddEventListenerOptions): void {
    if (options) {
      throw notImplemented('PermissionStatusFake.addEventListener() options argument')
    }
    if (type !== 'change') {
      throw notImplemented(`PermissionStatusFake.addEventListener() type: ${type}`)
    }
    this.changeListeners.push(listener)
  }

  dispatchEvent(event: Event): boolean {
    throw notImplemented('PermissionStatusFake.dispatchEvent()')
  }

  removeEventListener<K extends keyof PermissionStatusEventMap>(
    type: K,
    listener: (this: PermissionStatus, ev: PermissionStatusEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void
  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ): void
  removeEventListener(type: any, listener: any, options?: boolean | EventListenerOptions): void {
    if (options) {
      throw notImplemented('PermissionStatusFake.removeEventListener() options argument')
    }
    if (type !== 'change') {
      throw notImplemented(`PermissionStatusFake.removeEventListener() type: ${type}`)
    }
    const index = this.changeListeners.indexOf(listener)
    if (index >= 0) {
      this.changeListeners.splice(index, 1)
    }
  }
}
