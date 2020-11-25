export const notImplemented = (message?: string): Error => {
  return new Error(message ?? 'not implemented')
}
