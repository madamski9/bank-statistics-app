import { LinearTransition, ReduceMotion } from 'react-native-reanimated';

export const staggerMs = 35;
export const rowLayout = LinearTransition.springify().dampingRatio(0.9).duration(360).reduceMotion(ReduceMotion.System);
