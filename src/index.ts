export { MediaDevicesFake } from './MediaDevicesFake';
export { MediaDeviceDescription } from './MediaDeviceDescription';
export { anyMicrophone, anyCamera, anyDevice } from './DeviceMother';
export { PermissionPrompt, PermissionPromptAction } from './UserConsentTracker';

// todo testrig should be moved here
export { MediaStreamCheckResult, Scenario } from './Scenarios';
import { scenarios as all, passUndefined, existingDevice, allConstraintsFalse, requestedDeviceTypeNotAttached, noDeviceWithDeviceId } from './Scenarios';

export const scenarios = {
    all,
    passUndefined,
    existingDevice,
    allConstraintsFalse,
    requestedDeviceTypeNotAttached,
    noDeviceWithDeviceId
};
