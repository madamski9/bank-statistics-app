import { useColorScheme } from 'react-native';

export interface Theme {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceSelected: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  expense: string;
  income: string;
  accent: string;
  danger: string;
}

const lightTheme: Theme = {
  background: '#F4F6F9',
  surface: '#FFFFFF',
  surfaceMuted: '#E9EEF5',
  surfaceSelected: '#FFFFFF',
  border: 'rgba(16, 23, 37, 0.10)',
  textPrimary: '#101725',
  textSecondary: '#59637A',
  expense: '#B4233C',
  income: '#0B6B49',
  accent: '#1E40AF',
  danger: '#B4233C',
};

const darkTheme: Theme = {
  background: '#0F172A',
  surface: '#192134',
  surfaceMuted: '#232D44',
  surfaceSelected: '#3A4762',
  border: 'rgba(255, 255, 255, 0.10)',
  textPrimary: '#FFFFFF',
  textSecondary: '#A7B4CA',
  expense: '#FF8199',
  income: '#4ADE9B',
  accent: '#60A5FA',
  danger: '#FF8199',
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}
