export {}

declare global {
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Matchers<R> {
      toIncludeAudioTrack(): CustomMatcherResult
    }
  }
}

expect.extend({
  toIncludeAudioTrack(received: MediaStream): jest.CustomMatcherResult {
    const audioTracks = received.getTracks().filter((track) => track.kind === 'audio')
    const pass: boolean = audioTracks.length > 0
    const message: () => string = () => (pass ? '' : `includes no audio track`)
    return {
      message,
      pass,
    }
  },
})
