import { LocalListenerPropertySync } from '../LocalListenerPropertySync'

type OnChangeListener = (this: PermissionStatus, ev: Event) => any

export class PermissionStatusFake extends EventTarget implements PermissionStatus {
  private readonly _changeListener: LocalListenerPropertySync<OnChangeListener>

  constructor(private _state: PermissionState) {
    super()
    this._changeListener = new LocalListenerPropertySync<OnChangeListener>(this, 'change')
  }

  get state(): PermissionState {
    return this._state
  }

  updateTo(updatedPermission: PermissionState) {
    if (this._state === updatedPermission) {
      return
    }
    this._state = updatedPermission
    this.dispatchEvent(new Event('change'))
  }

  set onchange(listener: OnChangeListener | null) {
    this._changeListener.set(listener)
  }

  get onchange(): OnChangeListener | null {
    return this._changeListener.get()
  }
}
