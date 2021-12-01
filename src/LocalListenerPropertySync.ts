export class LocalListenerPropertySync<T extends EventListenerOrEventListenerObject> {
  private readonly type
  private _listener: T | null = null

  constructor(private readonly target: EventTarget, type: string) {
    this.type = type
  }

  set(listener: T | null) {
    if (this._listener !== listener) {
      this.target.removeEventListener(this.type, this._listener)
      this._listener = listener
    }
    this.target.addEventListener(this.type, listener)
  }

  get(): T | null {
    return this._listener
  }
}
