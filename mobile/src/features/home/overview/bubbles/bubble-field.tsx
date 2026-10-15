import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { GlassBubble, type BubbleOrigin } from './glass-bubble';
import { bubbleLayout, bubbleTints, overviewColors, type BubbleKey, type BubbleTint } from '@/features/app-shell/theme/overview-theme';

export interface BubbleDescriptor {
  key: BubbleKey;
  label: string;
  value: string;
  caption?: string;
  accessibilityLabel: string;
  tint?: BubbleTint;
}

interface BubbleFieldProps {
  bubbles: BubbleDescriptor[];
  variant: string;
  onSelect: (key: BubbleKey, origin: BubbleOrigin) => void;
}

interface BubbleSlotProps {
  bubble: BubbleDescriptor;
  variant: string;
  order: number;
  diameter: number;
  left: number;
  top: number;
  onSelect: (key: BubbleKey, origin: BubbleOrigin) => void;
}

const easeOut = Easing.bezier(0.23, 1, 0.32, 1);
const swapStagger = 70;
const veilOverscan = 1.08;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function BubbleSlot({ bubble, variant, order, diameter, left, top, onSelect }: BubbleSlotProps) {
  const [displayedVariant, setDisplayedVariant] = useState(variant);
  const [held, setHeld] = useState(bubble);
  const veil = useSharedValue(0);
  const isSettled = variant === displayedVariant;

  if (isSettled && held !== bubble) {
    setHeld(bubble);
  }

  const shown = isSettled ? bubble : held;

  useEffect(() => {
    if (variant === displayedVariant) {
      veil.set(withTiming(0, { duration: 340, easing: easeOut }));
      return;
    }

    const delay = order * swapStagger;

    veil.set(
      withDelay(
        delay,
        withTiming(1, { duration: 200, easing: easeOut }, (finished) => {
          if (finished) {
            scheduleOnRN(setDisplayedVariant, variant);
          }
        }),
      ),
    );
  }, [displayedVariant, order, variant, veil]);

  const veilStyle = useAnimatedStyle(() => ({
    opacity: veil.get(),
  }));

  const veilSize = diameter * veilOverscan;

  return (
    <View style={[styles.slot, { left, top }]}>
      <GlassBubble
        accessibilityLabel={shown.accessibilityLabel}
        bubbleKey={shown.key}
        caption={shown.caption}
        driftSeed={order}
        label={shown.label}
        onSelect={onSelect}
        size={diameter}
        tint={shown.tint ?? bubbleTints[shown.key]}
        value={shown.value}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.veil,
          {
            width: veilSize,
            height: veilSize,
            borderRadius: veilSize / 2,
            left: (diameter - veilSize) / 2,
            top: (diameter - veilSize) / 2,
          },
          veilStyle,
        ]}
      />
    </View>
  );
}

/**
 * The resting cluster: expenses large, income medium, net flow small, in the arrangement from
 * the sketch. Sizes come from the layout tokens, never from the amounts.
 */
export function BubbleField({ bubbles, variant, onSelect }: BubbleFieldProps) {
  const [field, setField] = useState({ width: 0, height: 0 });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    setField((current) =>
      current.width === width && current.height === height ? current : { width, height },
    );
  };

  const reference = Math.min(field.width, field.height * 0.85);

  return (
    <View onLayout={handleLayout} style={styles.field}>
      {reference > 0
        ? bubbles.map((bubble, index) => {
            const placement = bubbleLayout[bubble.key];
            const diameter = reference * placement.diameter;

            return (
              <BubbleSlot
                bubble={bubble}
                diameter={diameter}
                key={bubble.key}
                left={clamp(field.width * placement.centerX - diameter / 2, 0, Math.max(field.width - diameter, 0))}
                onSelect={onSelect}
                order={index}
                top={clamp(
                  field.height * placement.centerY - diameter / 2,
                  0,
                  Math.max(field.height - diameter, 0),
                )}
                variant={variant}
              />
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    minHeight: 280,
  },
  slot: {
    position: 'absolute',
  },
  veil: {
    position: 'absolute',
    backgroundColor: overviewColors.background,
  },
});
