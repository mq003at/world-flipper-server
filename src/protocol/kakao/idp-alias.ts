export function buildIdpAlias(appId: string, deviceId: string, discriminator: string): string {
    return `${appId}:${deviceId}:${discriminator}`;
}
