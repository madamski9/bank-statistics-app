import {
  assertApplicationMatchesLane,
  assertSupportedRuntime,
  resolveAppEnvironment,
  type ExecutionEnvironment,
} from '@bankstats/app-config';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

assertSupportedRuntime(Constants.executionEnvironment as ExecutionEnvironment);

export const appEnvironment = resolveAppEnvironment({
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  EXPO_PUBLIC_CONVEX_URL: process.env.EXPO_PUBLIC_CONVEX_URL,
  EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
  EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
});

const expectedApplicationId =
  Platform.OS === 'ios'
    ? Constants.expoConfig?.ios?.bundleIdentifier
    : Constants.expoConfig?.android?.package;

assertApplicationMatchesLane(appEnvironment.lane, expectedApplicationId, Application.applicationId);
