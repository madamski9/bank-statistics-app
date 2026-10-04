import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/localization/language';
import { overviewColors } from '@/features/spending-overview/overview-theme';
import { selectionChanged } from '@/haptics';

import { eventColorKeys, eventTints, type EventColorKey } from './event-colors';
import { eventsCopy } from './events-copy';

interface EventColorPickerProps {
  selected: EventColorKey;
  onSelect: (color: EventColorKey) => void;
}

export function EventColorPicker({ selected, onSelect }: EventColorPickerProps) {
  const copy = useCopy(eventsCopy);

  return (
    <View style={styles.section}>
      <Text maxFontSizeMultiplier={1.4} style={styles.label}>
        {copy.color}
      </Text>
      <View accessibilityRole="radiogroup" style={styles.row}>
        {eventColorKeys.map((key) => {
          const isSelected = key === selected;

          return (
            <Pressable
              accessibilityLabel={copy.colorNames[key]}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              hitSlop={4}
              key={key}
              onPress={() => {
                if (!isSelected) {
                  selectionChanged();
                  onSelect(key);
                }
              }}
              style={({ pressed }) => [
                styles.ring,
                isSelected ? { borderColor: eventTints[key].film } : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={[styles.swatch, { backgroundColor: eventTints[key].film }]} />
            </Pressable>
          );
        })}
      </View>
      <Text maxFontSizeMultiplier={1.4} style={styles.footnote}>
        {copy.colorHint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ring: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  pressed: {
    opacity: 0.6,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    color: overviewColors.textSecondary,
  },
});
