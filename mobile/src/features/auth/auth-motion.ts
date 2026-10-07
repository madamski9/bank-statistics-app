import { Platform } from 'react-native';
import { Easing, FadeInDown, FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';

export const authMotion = {
  focus: { duration: 180, reduceMotion: ReduceMotion.System },
  float: { duration: 14000, easing: Easing.linear, reduceMotion: ReduceMotion.System },
  layout: Platform.OS === 'web' ? undefined : LinearTransition.duration(280).easing(Easing.inOut(Easing.cubic)).reduceMotion(ReduceMotion.System),
  exit: FadeOut.duration(140).reduceMotion(ReduceMotion.System),
};

export function authEntering(delay = 0) {
  if (Platform.OS === 'web') {
    return undefined;
  }

  return FadeInDown.duration(420)
    .delay(delay)
    .withInitialValues({ transform: [{ translateY: 12 }] })
    .easing(Easing.out(Easing.cubic))
    .reduceMotion(ReduceMotion.System);
}
