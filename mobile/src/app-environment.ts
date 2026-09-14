import {
  assertSupportedRuntime,
  resolveAppEnvironment,
  type ExecutionEnvironment,
} from '@bankstats/app-config';
import Constants from 'expo-constants';

assertSupportedRuntime(Constants.executionEnvironment as ExecutionEnvironment);

export const appEnvironment = resolveAppEnvironment({
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  EXPO_PUBLIC_CONVEX_URL: process.env.EXPO_PUBLIC_CONVEX_URL,
});
