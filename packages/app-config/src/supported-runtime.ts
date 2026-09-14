export type ExecutionEnvironment = 'bare' | 'standalone' | 'storeClient';

export function assertSupportedRuntime(executionEnvironment: ExecutionEnvironment): void {
  if (executionEnvironment === 'storeClient') {
    throw new Error(
      'Expo Go is not a supported runtime. Install a development build with `./run.sh ios` or `./run.sh android`.',
    );
  }
}
