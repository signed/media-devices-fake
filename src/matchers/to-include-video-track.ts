export {}

declare global {
    namespace jest {
        interface Matchers<R> {
            toIncludeVideoTrack(): CustomMatcherResult;
        }
    }
}

expect.extend({
    toIncludeVideoTrack(received: MediaStream): jest.CustomMatcherResult {
        const videoTracks = received.getTracks().filter(track => track.kind === 'video');
        const pass: boolean = videoTracks.length > 0;
        const message: () => string = () => pass ? "" : `includes no video track`;
        return {
            message,
            pass,
        };
    },
});
