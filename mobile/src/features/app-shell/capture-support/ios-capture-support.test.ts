import { describe, expect, test } from 'bun:test';

import { iosCaptureSupport, iosMajorVersion } from './ios-capture-support';

describe('iosCaptureSupport', () => {
  test('asks for an update below iOS 27 and names the installed version', () => {
    expect(iosCaptureSupport('ios', '18.5')).toEqual({ kind: 'needsUpdate', iosVersion: '18.5' });
    expect(iosCaptureSupport('ios', '26.4.1')).toEqual({ kind: 'needsUpdate', iosVersion: '26.4.1' });
  });

  test('supports capture from iOS 27', () => {
    expect(iosCaptureSupport('ios', '27.0')).toEqual({ kind: 'supported' });
    expect(iosCaptureSupport('ios', '27.1.2')).toEqual({ kind: 'supported' });
    expect(iosCaptureSupport('ios', '28')).toEqual({ kind: 'supported' });
  });

  test('does not block capture when the version cannot be read', () => {
    expect(iosCaptureSupport('ios', '')).toEqual({ kind: 'supported' });
    expect(iosMajorVersion('unknown')).toBeNull();
  });

  test('leaves other platforms alone', () => {
    expect(iosCaptureSupport('android', 36)).toEqual({ kind: 'notIos' });
    expect(iosCaptureSupport('web', '')).toEqual({ kind: 'notIos' });
  });
});
