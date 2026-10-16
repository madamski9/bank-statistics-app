import { Platform } from 'react-native';

export const subscriptionManagementUrl = Platform.OS === 'android'
  ? 'https://play.google.com/store/account/subscriptions'
  : 'https://apps.apple.com/account/subscriptions';
