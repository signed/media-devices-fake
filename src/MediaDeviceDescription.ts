/**
 * Describes a media device that you an plug into the {@link MediaDevicesFake.attach}
 */
export interface MediaDeviceDescription {
    deviceId: string
    groupId: string
    kind: MediaDeviceKind
    label: string
}
