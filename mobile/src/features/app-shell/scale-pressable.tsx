import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const pressInSpring = { duration: 160, dampingRatio: 1, reduceMotion: ReduceMotion.System };
const releaseSpring = { duration: 320, dampingRatio: 0.6, reduceMotion: ReduceMotion.System };

interface ScalePressableProps extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  pressedScale?: number;
  children: ReactNode;
}

export function ScalePressable({
  style,
  containerStyle,
  pressedScale = 0.96,
  children,
  onPressIn,
  onPressOut,
  ...rest
}: ScalePressableProps) {
  const pressed = useSharedValue(0);

  const pressStyle = useAnimatedStyle(() => ({
    opacity: 1 - pressed.get() * 0.25,
    transform: [{ scale: 1 - pressed.get() * (1 - pressedScale) }],
  }));

  return (
    <Pressable
      {...rest}
      onPressIn={(event) => {
        pressed.set(withSpring(1, pressInSpring));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.set(withSpring(0, releaseSpring));
        onPressOut?.(event);
      }}
      style={containerStyle}
    >
      <Animated.View style={[style, pressStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
