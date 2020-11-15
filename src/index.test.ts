import { MediaDevicesFake } from './MediaDevicesFake';

describe('MediaDevicesFake', () => {
    describe('device access granted ', () => {
        test('return a video stream from an attached camera', async () => {
            const mediaDevicesFake = new MediaDevicesFake();
            mediaDevicesFake.attach({
                deviceId: 'the camera identifier',
                groupId: 'any group identifier',
                kind: 'videoinput',
                label: 'The Camera'
            });

            const userMedia = await mediaDevicesFake.getUserMedia({ video: true });
            expect(userMedia.getVideoTracks()[0].label).toEqual('The Camera')
        });
    });
});
