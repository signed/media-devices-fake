export { MediaDevicesFake } from './MediaDevicesFake';
export { MediaDeviceDescription } from './MediaDeviceDescription';

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
