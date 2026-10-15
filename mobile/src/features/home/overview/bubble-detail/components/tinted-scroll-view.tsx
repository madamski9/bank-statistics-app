import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

interface TintedScrollViewProps {
  color: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

const indicatorWidth = 3;
const indicatorInset = 3;
const minimumIndicatorHeight = 36;
const fadeOutDelayMs = 700;

export function TintedScrollView({ color, contentContainerStyle, style, children }: TintedScrollViewProps) {
  const offset = useSharedValue(0);
  const contentHeight = useSharedValue(0);
  const viewportHeight = useSharedValue(0);
  const visibility = useSharedValue(0);

  const reveal = () => {
    'worklet';
    visibility.set(withTiming(1, { duration: 120, reduceMotion: ReduceMotion.System }));
  };

  const conceal = () => {
    'worklet';
    visibility.set(
      withDelay(fadeOutDelayMs, withTiming(0, { duration: 260, reduceMotion: ReduceMotion.System })),
    );
  };

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      offset.set(event.contentOffset.y);
    },
    onBeginDrag: () => reveal(),
    onEndDrag: (event) => {
      if ((event.velocity?.y ?? 0) === 0) {
        conceal();
      }
    },
    onMomentumBegin: () => reveal(),
    onMomentumEnd: () => conceal(),
  });

  const indicatorStyle = useAnimatedStyle(() => {
    const visible = viewportHeight.get();
    const total = contentHeight.get();

    if (total <= visible || visible === 0) {
      return { opacity: 0, height: 0, transform: [{ translateY: 0 }] };
    }

    const height = Math.max((visible / total) * visible, minimumIndicatorHeight);
    const progress = Math.min(Math.max(offset.get() / (total - visible), 0), 1);

    return {
      opacity: visibility.get(),
      height,
      transform: [{ translateY: progress * (visible - height) }],
    };
  });

  return (
    <View style={[styles.frame, style]}>
      <Animated.ScrollView
        contentContainerStyle={contentContainerStyle}
        onContentSizeChange={(_, height) => contentHeight.set(height)}
        onLayout={(event) => viewportHeight.set(event.nativeEvent.layout.height)}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </Animated.ScrollView>
      <Animated.View
        pointerEvents="none"
        style={[styles.indicator, { backgroundColor: color }, indicatorStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    right: indicatorInset,
    width: indicatorWidth,
    borderRadius: indicatorWidth / 2,
  },
});
