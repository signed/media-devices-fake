import { allAccessAllowed, allAccessBlocked, anyCamera, anyMicrophone, forgeMediaDevices, MediaDevicesFake, PermissionPromptAction, RequestedMediaInput, stillHaveToAskForDeviceAccess } from './index';
import './matchers/dom-exception';
import './matchers/to-include-video-track';

describe('MediaDevicesFake', () => {
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
            const { mediaDevices, attach, deviceAccessPrompt } = forgeMediaDevices(stillHaveToAskForDeviceAccess());
            attach(anyMicrophone());

            const userMediaPromise = mediaDevices.getUserMedia({ audio: true });
            const permissionPrompt = await deviceAccessPrompt();
            expect(permissionPrompt.requestedPermissions()).toEqual([RequestedMediaInput.Microphone]);

            permissionPrompt.takeAction(PermissionPromptAction.Block);
            await expect(userMediaPromise).rejects.domException('Permission denied', 'NotAllowedError');

            // 2nd time should not need a permission prompt
            await expect(mediaDevices.getUserMedia({ audio: true })).rejects.domException('Permission denied', 'NotAllowedError');
        });
    });
    describe('device access granted', () => {
        test('return a video stream from an attached camera', async () => {
            const control = forgeMediaDevices(allAccessAllowed());
            control.attach(anyCamera({ label: 'The Camera' }));
            const userMedia = await control.mediaDevices.getUserMedia({ video: true });
            expect(userMedia.getVideoTracks()[0].label).toEqual('The Camera');
        });
        test('reject media stream requests if no device is available', async () => {
            const onlyMicrophone = anyMicrophone();
            const { mediaDevices, remove } = forgeMediaDevices(allAccessAllowed({ attachedDevices: [onlyMicrophone] }));
            remove(onlyMicrophone);
            await expect(mediaDevices.getUserMedia({ audio: true })).rejects.domException('Requested device not found', 'NotFoundError');
        });
    });
    describe('device access blocked', () => {
        test('reject media stream requests', async () => {
            const { mediaDevices } = forgeMediaDevices(allAccessBlocked({ attachedDevices: [anyMicrophone()] }));
            await expect(mediaDevices.getUserMedia({ audio: true })).rejects.domException('Permission denied', 'NotAllowedError');
        });
    });
});
