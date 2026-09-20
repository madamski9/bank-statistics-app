import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { GlassBubble, type BubbleOrigin } from './glass-bubble';
import { bubbleLayout, type BubbleKey } from './overview-theme';

export interface BubbleDescriptor {
  key: BubbleKey;
  label: string;
  value: string;
  caption?: string;
  accessibilityLabel: string;
}

interface BubbleFieldProps {
  bubbles: BubbleDescriptor[];
  onSelect: (key: BubbleKey, origin: BubbleOrigin) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * The resting cluster: expenses large, income medium, net flow small, in the arrangement from
 * the sketch. Sizes come from the layout tokens, never from the amounts.
 */
export function BubbleField({ bubbles, onSelect }: BubbleFieldProps) {
  const [field, setField] = useState({ width: 0, height: 0 });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    setField((current) =>
      current.width === width && current.height === height ? current : { width, height },
    );
  };

  const reference = Math.min(field.width, field.height * 0.95);

  return (
    <View onLayout={handleLayout} style={styles.field}>
      {reference > 0
        ? bubbles.map((bubble, index) => {
            const placement = bubbleLayout[bubble.key];
            const diameter = reference * placement.diameter;

            return (
              <View
                key={bubble.key}
                style={[
                  styles.slot,
                  {
                    left: clamp(
                      field.width * placement.centerX - diameter / 2,
                      0,
                      Math.max(field.width - diameter, 0),
                    ),
                    top: clamp(
                      field.height * placement.centerY - diameter / 2,
                      0,
                      Math.max(field.height - diameter, 0),
                    ),
                  },
                ]}
              >
                <GlassBubble
                  accessibilityLabel={bubble.accessibilityLabel}
                  caption={bubble.caption}
                  driftSeed={index}
                  label={bubble.label}
                  onSelect={(origin) => onSelect(bubble.key, origin)}
                  size={diameter}
                  tint={bubble.key}
                  value={bubble.value}
                />
              </View>
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
});
