import { StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { eventTint } from '@/features/insights/events/event-colors';
import { eventsCopy } from '@/features/insights/events/events-copy';
import type { SpendingEvent } from '@/features/insights/events/spending-event';

import type { EventBoundary } from '../history-sections';

interface EventMarkerRowProps {
  event: SpendingEvent;
  boundary: EventBoundary;
}

export function EventMarkerRow({ event, boundary }: EventMarkerRowProps) {
  const copy = useCopy(eventsCopy);
  const markerTint = eventTint(event);
  const markerLabel = boundary === 'start' ? copy.markerStart(event.name) : copy.markerEnd(event.name);

  return (
    <View accessible accessibilityLabel={markerLabel} style={styles.marker}>
      <View style={[styles.markerLine, { backgroundColor: markerTint.film }]} />
      <Text
        maxFontSizeMultiplier={1.4}
        numberOfLines={1}
        style={[styles.markerLabel, { color: markerTint.film }]}
      >
        {markerLabel}
      </Text>
      <View style={[styles.markerLine, { backgroundColor: markerTint.film }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  marker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  markerLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    opacity: 0.8,
  },
  markerLabel: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
