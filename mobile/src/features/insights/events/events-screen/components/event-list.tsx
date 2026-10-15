import { StyleSheet, Text } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { SheetRow } from '@/features/app-shell/sheet/components/sheet-row';
import { SheetSection } from '@/features/app-shell/sheet/components/sheet-section';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { reportingCurrency } from '@/features/data/currency-conversion/exchange-rate';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import { eventPeriodLabel } from '../../event-period-label';
import type { EventSummary } from '../../event-summary';
import { eventsCopy } from '../../events-copy';
import { isActive, type SpendingEvent } from '../../spending-event';

interface EventListProps {
  events: SpendingEvent[];
  summaries: Map<string, EventSummary>;
  now: Date;
  onSelect: (id: string) => void;
}

export function EventList({ events, summaries, now, onSelect }: EventListProps) {
  const copy = useCopy(eventsCopy);
  const { formatAmount } = useAmountFormatting();

  if (events.length === 0) {
    return (
      <Text maxFontSizeMultiplier={1.5} style={styles.empty}>
        {copy.empty}
      </Text>
    );
  }

  return (
    <SheetSection>
      {events.map((event, index) => (
        <SheetRow
          detail={eventPeriodLabel(event, now, copy)}
          isFirst={index === 0}
          key={event.id}
          label={event.name}
          onPress={() => onSelect(event.id)}
          value={formatAmount(summaries.get(event.id)?.expenseMinor ?? 0, reportingCurrency)}
          valueTone={isActive(event) ? 'caution' : 'default'}
        />
      ))}
    </SheetSection>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
});
