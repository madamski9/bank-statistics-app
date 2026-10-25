export const minimumCaptureIosMajor = 27;

export type IosCaptureSupport =
  | { kind: 'supported' }
  | { kind: 'needsUpdate'; iosVersion: string }
  | { kind: 'notIos' };

export function iosMajorVersion(version: string | number): number | null {
  const major = Number.parseInt(String(version), 10);

  return Number.isNaN(major) ? null : major;
}

export function iosCaptureSupport(os: string, version: string | number): IosCaptureSupport {
  if (os !== 'ios') {
    return { kind: 'notIos' };
  }

  const major = iosMajorVersion(version);

  return major !== null && major < minimumCaptureIosMajor
    ? { kind: 'needsUpdate', iosVersion: String(version) }
    : { kind: 'supported' };
}
