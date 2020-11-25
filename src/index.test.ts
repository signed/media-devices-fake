import { allAccessAllowed, anyCamera, anyMicrophone, forgeMediaDevices, MediaDevicesFake, PermissionPromptAction, RequestedMediaInput, stillHaveToAskForDeviceAccess } from './index';
import './matchers/dom-exception';
import './matchers/to-include-video-track';

describe('MediaDevicesFake', () => {
    describe('device access granted', () => {
        test('return a video stream from an attached camera', async () => {
            const control = forgeMediaDevices(allAccessAllowed());
            control.attach(anyCamera({ label: 'The Camera' }));
            const userMedia = await control.mediaDevices.getUserMedia({ video: true });
            expect(userMedia.getVideoTracks()[0].label).toEqual('The Camera');
        });
    });
    describe('still have to ask for device access', () => {
        test('return a video stream from an attached camera after granting access', async () => {
            const control = forgeMediaDevices(stillHaveToAskForDeviceAccess({ attachedDevices: [anyCamera({ label: 'The Camera' })] }));
            const userMediaPromise = control.mediaDevices.getUserMedia({ video: true });
            const permissionPrompt = await control.deviceAccessPrompt();
            expect(permissionPrompt.requestedPermissions()).toEqual([RequestedMediaInput.Camera]);
            permissionPrompt.takeAction(PermissionPromptAction.Allow);
            expect((await userMediaPromise).getVideoTracks()[0].label).toEqual('The Camera');

            // 2nd time should not need a permission prompt
            expect(await control.mediaDevices.getUserMedia({ video: true })).toIncludeVideoTrack();
        });

        test('reject promise with a DomException after blocking access', async () => {
            const control = forgeMediaDevices(stillHaveToAskForDeviceAccess());

            const mediaDevicesFake = control.mediaDevices;
            control.attach(anyMicrophone());

            const userMediaPromise = mediaDevicesFake.getUserMedia({ audio: true });
            const permissionPrompt = await control.deviceAccessPrompt();
            expect(permissionPrompt.requestedPermissions()).toEqual([RequestedMediaInput.Microphone]);

            permissionPrompt.takeAction(PermissionPromptAction.Block);
            await expect(userMediaPromise).rejects.domException('Permission denied', 'NotAllowedError');

            // 2nd time should not need a permission prompt
            await expect(mediaDevicesFake.getUserMedia({ audio: true })).rejects.domException('Permission denied', 'NotAllowedError');
        });
    });
});
