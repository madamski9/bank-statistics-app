import { Platform } from 'react-native';

import { iosCaptureSupport } from './ios-capture-support';

export const deviceCaptureSupport = iosCaptureSupport(Platform.OS, Platform.Version);

export const needsIosUpdateForCapture = deviceCaptureSupport.kind === 'needsUpdate';
