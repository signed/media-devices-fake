import { MediaDevicesFake } from './MediaDevicesFake';
import { allPermissionsGranted, PermissionPromptAction, RequestedMediaInput, stillHaveToAskForDeviceAccess } from './UserConsentTracker';

describe('MediaDevicesFake', () => {
    describe('device access granted', () => {
        test('return a video stream from an attached camera', async () => {
            const mediaDevicesFake = new MediaDevicesFake(allPermissionsGranted());
            mediaDevicesFake.attach({
                deviceId: 'the camera identifier',
                groupId: 'any group identifier',
                kind: 'videoinput',
                label: 'The Camera'
            });

            const userMedia = await mediaDevicesFake.getUserMedia({ video: true });
            expect(userMedia.getVideoTracks()[0].label).toEqual('The Camera');
        });
    });
    describe('still have to ask for device access', () => {
        test('return a video stream from an attached camera after granting access', async () => {
            const userConsentTracker = stillHaveToAskForDeviceAccess();
            const mediaDevicesFake = new MediaDevicesFake(userConsentTracker);
            mediaDevicesFake.attach({
                deviceId: 'the camera identifier',
                groupId: 'any group identifier',
                kind: 'videoinput',
                label: 'The Camera'
            });

            const userMediaPromise = mediaDevicesFake.getUserMedia({ video: true });
            const permissionPrompt = await userConsentTracker.deviceAccessPrompt();
            expect(permissionPrompt.requestedPermissions()).toEqual([RequestedMediaInput.Camera])
            permissionPrompt.takeAction(PermissionPromptAction.Allow)
            expect((await userMediaPromise).getVideoTracks()[0].label).toEqual('The Camera');
        });
    });
});
