import { HStack, Image, ProgressView, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  accessibilityHidden,
  background,
  blur,
  containerBackground,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  padding,
  progressViewStyle,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { SpendingWidgetProps, WidgetLimit } from './widget-snapshot';

export type SpendingWidgetScreen = 'month' | 'watch' | 'limits' | 'shops';

export interface SpendingWidgetConfiguration {
  startScreen: SpendingWidgetScreen;
}

function spendingWidgetLayout(
  props: SpendingWidgetProps,
  environment: WidgetEnvironment<SpendingWidgetConfiguration>,
) {
  'widget';

  const dark = environment.colorScheme !== 'light';
  const palette = dark
    ? {
        background: '#111B2B',
        backgroundEnd: '#18283C',
        surface: '#22334A',
        primary: '#F4F7FC',
        secondary: '#AFBFD2',
        accent: '#8BBDFF',
        calm: '#75DDB9',
        caution: '#FFD08A',
        over: '#FFA0AC',
      }
    : {
        background: '#F8FAFF',
        backgroundEnd: '#EAF1FC',
        surface: '#E0EAF8',
        primary: '#172B46',
        secondary: '#52647C',
        accent: '#245EB2',
        calm: '#176E53',
        caution: '#895000',
        over: '#AF304C',
      };
  const family = environment.widgetFamily;
  const accessory = family.startsWith('accessory');
  const wide = family === 'systemMedium' || family === 'systemLarge';
  const screen = props.screen === 'month' || props.screen === undefined
    ? environment.configuration?.startScreen ?? 'month'
    : props.screen;
  const limits = props.limits ?? [];
  const shops = props.shops ?? [];
  const urgent = limits[0];
  const now = environment.date;
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const newMonth = props.status === 'ready' && props.monthKey !== monthKey;
  const toneColor = (tone: WidgetLimit['tone']) =>
    tone === 'over' ? palette.over : tone === 'caution' ? palette.caution : palette.calm;
  const container = containerBackground(
    accessory ? '#00000000' : {
      type: 'linearGradient',
      colors: [palette.background, palette.backgroundEnd],
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 1, y: 1 },
    },
    'widget',
  );
  const isBlurred = props.isBlurred === true && props.status === 'ready';
  const tapUrl = isBlurred ? props.revealUrl : props.openUrl;
  const opensApp = tapUrl ? [widgetURL(tapUrl)] : [];

  const caption = (text: string, color = palette.secondary) => (
    <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(color), lineLimit(1), minimumScaleFactor(0.85)]}>
      {text}
    </Text>
  );

  const amount = (text: string, size: number, color = palette.primary) => (
    <Text modifiers={[
      font({ size, weight: 'bold', design: 'rounded' }),
      foregroundStyle(color),
      monospacedDigit(),
      lineLimit(1),
      minimumScaleFactor(0.65),
    ]}>
      {text}
    </Text>
  );

  const progress = (share: number, color: string) => (
    <ProgressView value={Math.min(Math.max(share, 0), 1)} modifiers={[
      progressViewStyle('linear'), tint(color),
    ]} />
  );

  const header = (title: string, symbol: 'chart.bar.fill' | 'gauge.with.dots.needle.67percent' | 'slider.horizontal.3' | 'bag.fill', color = palette.accent) => (
    <HStack spacing={6}>
      <Image systemName={symbol} size={13} color={color} modifiers={[accessibilityHidden(true)]} />
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(color), lineLimit(1), minimumScaleFactor(0.85)]}>
        {title}
      </Text>
      <Spacer minLength={0} />
      {wide ? caption(props.monthLabel) : null}
    </HStack>
  );

  const empty = (title: string, detail: string) => (
    <VStack alignment="leading" spacing={6}>
      <Spacer minLength={0} />
      <Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundStyle(palette.primary), lineLimit(2)]}>
        {title}
      </Text>
      <Text modifiers={[font({ size: 12 }), foregroundStyle(palette.secondary), lineLimit(3)]}>
        {detail}
      </Text>
      <Spacer minLength={0} />
    </VStack>
  );

  const limitRow = (limit: WidgetLimit) => (
    <VStack key={limit.name} alignment="leading" spacing={4}>
      <HStack spacing={6}>
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(palette.primary), lineLimit(1)]}>
          {limit.name}
        </Text>
        <Spacer minLength={0} />
        {amount(`${Math.round(limit.share * 100)}%`, 12, toneColor(limit.tone))}
      </HStack>
      {progress(limit.share, toneColor(limit.tone))}
      {caption(`${limit.spentLabel} z ${limit.targetLabel}`)}
    </VStack>
  );

  const shopRow = (shop: { name: string; amountLabel: string; share: number }, index: number) => (
    <HStack key={shop.name} spacing={8}>
      <Text modifiers={[
        font({ size: 11, weight: 'semibold', design: 'rounded' }),
        foregroundStyle(palette.accent),
        frame({ width: 22, height: 26 }),
        background(palette.surface),
        cornerRadius(7),
        accessibilityHidden(true),
      ]}>
        {String(index + 1)}
      </Text>
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ size: wide ? 13 : 12, weight: 'medium' }), foregroundStyle(palette.primary), lineLimit(1)]}>
          {shop.name}
        </Text>
        {wide ? null : amount(shop.amountLabel, 12, palette.secondary)}
      </VStack>
      <Spacer minLength={0} />
      {wide ? amount(shop.amountLabel, 13) : null}
    </HStack>
  );

  if (accessory) {
    if (isBlurred) {
      return (
        <HStack spacing={4} modifiers={[container, ...opensApp]}>
          <Image systemName="lock.fill" size={12} />
          <Text>BankStats</Text>
        </HStack>
      );
    }
    if (props.status !== 'ready' || newMonth) {
      return <Text modifiers={[container, ...opensApp]}>Otwórz BankStats</Text>;
    }
    if (family === 'accessoryInline') {
      return (
        <Text modifiers={[container, ...opensApp]}>
          {`${props.monthLabel}: ${props.expenseLabel}`}
        </Text>
      );
    }
    return (
      <VStack alignment="leading" spacing={2} modifiers={[container, ...opensApp]}>
        <Text modifiers={[font({ size: 12, weight: 'medium' }), lineLimit(1)]}>{`Wydatki · ${props.monthLabel}`}</Text>
        <Text modifiers={[font({ size: 22, weight: 'bold', design: 'rounded' }), monospacedDigit(), lineLimit(1), minimumScaleFactor(0.6)]}>
          {props.expenseLabel}
        </Text>
        {urgent ? <Text modifiers={[font({ size: 11 }), lineLimit(1)]}>{`${urgent.name}: ${urgent.remainingLabel}`}</Text> : null}
      </VStack>
    );
  }

  const month = () => (
    <VStack alignment="leading" spacing={4}>
      {header(wide ? 'Wydatki' : props.monthLabel, 'chart.bar.fill')}
      <Spacer minLength={0} />
      <HStack alignment="center" spacing={16}>
        <VStack alignment="leading" spacing={4} modifiers={[frame({ maxWidth: 10_000, alignment: 'leading' })]}>
          {caption('W tym miesiącu')}
          {amount(props.expenseLabel, wide ? 36 : 30)}
          {caption(props.countLabel)}
        </VStack>
        {wide ? (
          <VStack alignment="leading" spacing={5} modifiers={[
            padding({ all: 12 }), background(palette.surface), cornerRadius(14),
          ]}>
            <Image systemName="calendar" size={17} color={palette.accent} modifiers={[accessibilityHidden(true)]} />
            {caption('Średnio dziennie')}
            {amount(props.dailyAmountLabel ?? props.dailyLabel, 19, palette.accent)}
          </VStack>
        ) : null}
      </HStack>
      <Spacer minLength={0} />
      {caption(wide ? `Stan na ${props.updatedLabel}` : props.dailyLabel)}
    </VStack>
  );

  const watch = () => (
    <VStack alignment="leading" spacing={4}>
      {header('Najbliżej limitu', 'gauge.with.dots.needle.67percent')}
      {urgent ? (
        <VStack alignment="leading" spacing={4}>
          <Spacer minLength={0} />
          {caption(urgent.name, palette.primary)}
          {caption(urgent.tone === 'over' ? 'Ponad limit' : 'Do wykorzystania', toneColor(urgent.tone))}
          {amount(urgent.remainingAmountLabel ?? urgent.remainingLabel, wide ? 32 : 28, toneColor(urgent.tone))}
          {progress(urgent.share, toneColor(urgent.tone))}
          {caption(`${urgent.spentLabel} z ${urgent.targetLabel}`)}
          <Spacer minLength={0} />
          {wide ? caption(urgent.daysLeftLabel) : null}
        </VStack>
      ) : empty('Spokojnie, bez limitów', 'Dodaj limit w aplikacji, żeby śledzić wydatki.')}
    </VStack>
  );

  const limitList = () => (
    <VStack alignment="leading" spacing={8}>
      {header('Twoje limity', 'slider.horizontal.3')}
      {limits.length > 0 ? (
        <VStack alignment="leading" spacing={8}>
          <Spacer minLength={0} />
          {limits.slice(0, 2).map(limitRow)}
          <Spacer minLength={0} />
        </VStack>
      ) : empty('Twój plan wydatków', 'Ustaw pierwszy limit w aplikacji.')}
    </VStack>
  );

  const shopList = () => (
    <VStack alignment="leading" spacing={8}>
      {header(wide ? 'Najwięcej w sklepach' : 'Sklepy', 'bag.fill')}
      {shops.length > 0 ? (
        <VStack alignment="leading" spacing={wide ? 8 : 4}>
          {shops.slice(0, 3).map(shopRow)}
          <Spacer minLength={0} />
        </VStack>
      ) : empty('Jeszcze bez zakupów', 'Pierwsza płatność pojawi się tutaj automatycznie.')}
    </VStack>
  );

  const content = props.status === 'signedOut'
    ? empty('Twoje wydatki pod ręką', 'Zaloguj się w BankStats.')
    : props.status === 'locked'
      ? empty('Widżety w Premium', 'Odblokuj BankStats Premium w aplikacji.')
    : props.status !== 'ready'
      ? empty('Witaj w BankStats', 'Otwórz aplikację, żeby włączyć widżet.')
      : newMonth
        ? empty('Nowy miesiąc', 'Otwórz aplikację lub poczekaj na pierwszą transakcję.')
        : screen === 'watch'
          ? watch()
          : screen === 'limits'
            ? limitList()
            : screen === 'shops'
              ? shopList()
              : month();

  if (isBlurred) {
    return (
      <ZStack modifiers={[frame({ maxWidth: 10_000, maxHeight: 10_000 }), container, ...opensApp]}>
        <VStack alignment="leading" modifiers={[
          frame({ maxWidth: 10_000, maxHeight: 10_000, alignment: 'topLeading' }),
          blur(14),
          accessibilityHidden(true),
        ]}>
          {content}
        </VStack>
        <VStack spacing={6}>
          <Image systemName="lock.fill" size={20} color={palette.primary} modifiers={[accessibilityHidden(true)]} />
          {caption('Dotknij, aby odsłonić', palette.primary)}
        </VStack>
      </ZStack>
    );
  }

  return (
    <VStack alignment="leading" modifiers={[
      frame({ maxWidth: 10_000, maxHeight: 10_000, alignment: 'topLeading' }),
      container,
      ...opensApp,
    ]}>
      {content}
    </VStack>
  );
}

export const spendingWidgets = [
  { screen: 'month', widget: createWidget<SpendingWidgetProps, SpendingWidgetConfiguration>('SpendingWidget', spendingWidgetLayout) },
  { screen: 'watch', widget: createWidget<SpendingWidgetProps, SpendingWidgetConfiguration>('SpendingWatchWidget', spendingWidgetLayout) },
  { screen: 'limits', widget: createWidget<SpendingWidgetProps, SpendingWidgetConfiguration>('SpendingLimitsWidget', spendingWidgetLayout) },
  { screen: 'shops', widget: createWidget<SpendingWidgetProps, SpendingWidgetConfiguration>('SpendingShopsWidget', spendingWidgetLayout) },
] as const;
