import type { SymbolViewProps } from 'expo-symbols';

type SymbolNames = Exclude<SymbolViewProps['name'], string>;

export interface PlatformSymbol {
  ios: NonNullable<SymbolNames['ios']>;
  android: NonNullable<SymbolNames['android']>;
  web: NonNullable<SymbolNames['web']>;
}
