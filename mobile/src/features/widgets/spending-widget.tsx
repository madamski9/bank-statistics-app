import {
  Button,
  Circle,
  HStack,
  Image,
  ProgressView,
  Spacer,
  Text,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  blur,
  buttonStyle,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  progressViewStyle,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { SpendingWidgetProps, WidgetLimit } from './widget-snapshot';

export type SpendingWidgetScreen = 'month' | 'watch' | 'limits' | 'shops';

type MessageSymbol =
  | 'person.crop.circle.badge.questionmark'
  | 'chart.bar.xaxis'
  | 'calendar.badge.clock';

export interface SpendingWidgetConfiguration {
  startScreen: SpendingWidgetScreen;
}

function spendingWidgetLayout(
  props: SpendingWidgetProps,
  environment: WidgetEnvironment<SpendingWidgetConfiguration>,
) {
  'widget';

  const palette = {
    background: '#000000',
    primary: '#FFFFFF',
    secondary: '#8E8E93',
    track: '#2C2C2E',
    expense: '#FF5C8A',
    calm: '#34E39B',
    caution: '#FFC46B',
    over: '#FF5C7A',
  };
  const staleAfterMs = 12 * 3_600_000;
  const family = environment.widgetFamily;
  const isAccessory = family.startsWith('accessory');
  const isWide = family === 'systemMedium' || family === 'systemLarge';
  const now = environment.date;
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isNewMonth = props.status === 'ready' && props.monthKey !== currentMonthKey;
  const isStale = props.status === 'ready' && now.getTime() - props.updatedAtMs > staleAfterMs;
  const limits = props.limits ?? [];
  const shops = props.shops ?? [];
  const urgent: WidgetLimit | undefined = limits[0];
  const screens: SpendingWidgetScreen[] = ['month'];

  if (urgent !== undefined) {
    screens.push('watch', 'limits');
  }

  if (shops.length > 0) {
    screens.push('shops');
  }

  const startIndex = Math.max(screens.indexOf(environment.configuration?.startScreen ?? 'month'), 0);
  const screen = screens[(startIndex + (props.step ?? 0)) % screens.length];
  const toneColor = (tone: WidgetLimit['tone']) =>
    tone === 'over' ? palette.over : tone === 'caution' ? palette.caution : palette.calm;
  const background = containerBackground(isAccessory ? '#00000000' : palette.background, 'widget');
  const isBlurred = props.isBlurred === true && props.status === 'ready';
  const tapUrl = isBlurred ? props.revealUrl : props.openUrl;
  const opensApp = tapUrl ? [widgetURL(tapUrl)] : [];

  const caption = ({ text, color }: { text: string; color?: string }) => (
    <Text
      modifiers={[
        font({ size: 11, weight: 'semibold' }),
        foregroundStyle(color ?? palette.secondary),
        lineLimit(1),
      ]}>
      {text}
    </Text>
  );

  const amount = ({ text, size, color }: { text: string; size: number; color?: string }) => (
    <Text
      modifiers={[
        font({ size, weight: 'bold', design: 'rounded' }),
        foregroundStyle(color ?? palette.primary),
        monospacedDigit(),
        lineLimit(1),
        minimumScaleFactor(0.5),
      ]}>
      {text}
    </Text>
  );

  const bar = ({ share, color }: { share: number; color: string }) => (
    <ProgressView
      value={Math.min(Math.max(share, 0), 1)}
      modifiers={[progressViewStyle('linear'), tint(color)]}
    />
  );

  const pager = () => (
    <Button
      target="next-screen"
      onPress={() => ({ step: (props.step ?? 0) + 1 })}
      modifiers={[buttonStyle('plain')]}>
      <HStack spacing={4}>
        {screens.map((candidate) => (
          <Circle
            key={candidate}
            modifiers={[
              frame({ width: 5, height: 5 }),
              foregroundStyle(candidate === screen ? palette.primary : palette.track),
            ]}
          />
        ))}
        <Image systemName="chevron.right.circle.fill" size={18} color={palette.secondary} />
      </HStack>
    </Button>
  );

  const header = ({ title, color }: { title: string; color?: string }) => (
    <HStack>
      {caption({ text: title.toUpperCase(), color })}
      <Spacer />
      {screens.length > 1 && !isBlurred ? pager() : null}
    </HStack>
  );

  const footer = ({ text }: { text: string }) =>
    isStale ? (
      caption({ text: `Dane z ${props.updatedLabel}`, color: palette.caution })
    ) : (
      caption({ text })
    );

  const limitRow = ({ limit }: { limit: WidgetLimit }) => (
    <VStack alignment="leading" spacing={3}>
      <HStack>
        <Text
          modifiers={[
            font({ size: 13, weight: 'semibold' }),
            foregroundStyle(palette.primary),
            lineLimit(1),
              ]}>
          {limit.name}
        </Text>
        <Spacer />
        <Text
          modifiers={[
            font({ size: 12, weight: 'medium' }),
            foregroundStyle(toneColor(limit.tone)),
            monospacedDigit(),
            lineLimit(1),
              ]}>
          {`${limit.spentLabel} / ${limit.targetLabel}`}
        </Text>
      </HStack>
      {bar({ share: limit.share, color: toneColor(limit.tone) })}
    </VStack>
  );

  const shopRow = ({ name, amountLabel, rank }: { name: string; amountLabel: string; rank: number }) => (
    <HStack spacing={6}>
      <Text
        modifiers={[
          font({ size: 11, weight: 'bold', design: 'rounded' }),
          foregroundStyle(palette.secondary),
          monospacedDigit(),
        ]}>
        {String(rank)}
      </Text>
      <Text
        modifiers={[
          font({ size: 13, weight: 'semibold' }),
          foregroundStyle(palette.primary),
          lineLimit(1),
          ]}>
        {name}
      </Text>
      <Spacer />
      <Text
        modifiers={[
          font({ size: 13, weight: 'medium' }),
          foregroundStyle(palette.expense),
          monospacedDigit(),
          lineLimit(1),
          ]}>
        {amountLabel}
      </Text>
    </HStack>
  );

  const message = ({ symbol, title, detail }: { symbol: MessageSymbol; title: string; detail: string }) => (
    <VStack
      alignment="leading"
      spacing={6}
      modifiers={[frame({ maxWidth: 10_000, maxHeight: 10_000, alignment: 'topLeading' }), background, ...opensApp]}>
      <Image systemName={symbol} size={22} color={palette.expense} />
      <Spacer />
      <Text
        modifiers={[
          font({ size: 15, weight: 'bold' }),
          foregroundStyle(palette.primary),
          lineLimit(2),
        ]}>
        {title}
      </Text>
      {caption({ text: detail })}
    </VStack>
  );

  if (isAccessory) {
    if (isBlurred) {
      return (
        <HStack spacing={4} modifiers={[background, ...opensApp]}>
          <Image systemName="lock.fill" size={12} />
          <Text>BankStats</Text>
        </HStack>
      );
    }

    if (props.status !== 'ready' || isNewMonth) {
      return (
        <HStack modifiers={[background, ...opensApp]}>
          <Text>BankStats</Text>
        </HStack>
      );
    }

    if (family === 'accessoryInline') {
      return (
        <Text modifiers={[background]}>
          {`${props.monthLabel}: ${props.expenseLabel}`}
        </Text>
      );
    }

    return (
      <VStack alignment="leading" spacing={1} modifiers={[background, ...opensApp]}>
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), lineLimit(1)]}>
          {`Wydatki · ${props.monthLabel}`}
        </Text>
        <Text
          modifiers={[
            font({ size: 20, weight: 'bold', design: 'rounded' }),
            monospacedDigit(),
            lineLimit(1),
            minimumScaleFactor(0.6),
              ]}>
          {props.expenseLabel}
        </Text>
        {urgent !== undefined ? (
          <Text modifiers={[font({ size: 12 }), lineLimit(1)]}>
            {`${urgent.name}: ${urgent.remainingLabel}`}
          </Text>
        ) : null}
      </VStack>
    );
  }

  if (props.status === 'signedOut') {
    return (
      message({ symbol: 'person.crop.circle.badge.questionmark', title: 'Zaloguj się w BankStats', detail: 'Widżet pokaże wtedy wydatki' })
    );
  }

  if (props.status !== 'ready') {
    return (
      message({ symbol: 'chart.bar.xaxis', title: 'Otwórz BankStats', detail: 'Policzymy wydatki tego miesiąca' })
    );
  }

  if (isNewMonth) {
    return (
      message({ symbol: 'calendar.badge.clock', title: 'Nowy miesiąc', detail: 'Otwórz BankStats, żeby odświeżyć' })
    );
  }

  const monthScreen = () => (
    <VStack alignment="leading" spacing={2}>
      {header({ title: props.monthLabel })}
      <Spacer />
      {caption({ text: 'Wydatki' })}
      {amount({ text: props.expenseLabel, size: isWide ? 34 : 28 })}
      <Spacer />
      {footer({ text: isWide ? `${props.countLabel} · ${props.dailyLabel}` : props.dailyLabel })}
    </VStack>
  );

  const wideMonthScreen = () => (
    <VStack alignment="leading" spacing={6}>
      {header({ title: props.monthLabel })}
      <HStack alignment="top" spacing={16}>
        <VStack alignment="leading" spacing={2}>
          {caption({ text: 'Wydatki' })}
          {amount({ text: props.expenseLabel, size: 32 })}
          {caption({ text: props.countLabel })}
        </VStack>
        <Spacer />
        <VStack alignment="leading" spacing={5} modifiers={[frame({ width: 150 })]}>
          {shops.slice(0, 3).map((shop, index) => (
            shopRow({ name: shop.name, amountLabel: shop.amountLabel, rank: index + 1 })
          ))}
        </VStack>
      </HStack>
      <Spacer />
      {footer({ text: props.dailyLabel })}
    </VStack>
  );

  const watchScreen = ({ limit }: { limit: WidgetLimit }) => (
    <VStack alignment="leading" spacing={4}>
      {header({ title: limit.tone === 'calm' ? 'Najbliżej limitu' : 'Uważaj', color: limit.tone === 'calm' ? undefined : toneColor(limit.tone) })}
      <Spacer />
      <Text
        modifiers={[
          font({ size: 15, weight: 'semibold' }),
          foregroundStyle(palette.primary),
          lineLimit(1),
          ]}>
        {limit.name}
      </Text>
      {amount({ text: limit.remainingLabel, size: isWide ? 26 : 20, color: toneColor(limit.tone) })}
      {bar({ share: limit.share, color: toneColor(limit.tone) })}
      {footer({ text: `${limit.spentLabel} z ${limit.targetLabel} · ${limit.daysLeftLabel}` })}
    </VStack>
  );

  const limitsScreen = () => (
    <VStack alignment="leading" spacing={7}>
      {header({ title: 'Limity' })}
      <Spacer />
      {limits.slice(0, isWide ? 3 : 2).map((limit) => (
        limitRow({ limit })
      ))}
      <Spacer />
    </VStack>
  );

  const shopsScreen = () => (
    <VStack alignment="leading" spacing={6}>
      {header({ title: 'Najwięcej wydajesz' })}
      <Spacer />
      {shops.slice(0, isWide ? 4 : 3).map((shop, index) => (
        shopRow({ name: shop.name, amountLabel: shop.amountLabel, rank: index + 1 })
      ))}
      <Spacer />
    </VStack>
  );

  const content =
    screen === 'watch' && urgent !== undefined ? (
      watchScreen({ limit: urgent })
    ) : screen === 'limits' ? (
      limitsScreen()
    ) : screen === 'shops' ? (
      shopsScreen()
    ) : isWide && shops.length > 0 ? (
      wideMonthScreen()
    ) : (
      monthScreen()
    );

  if (isBlurred) {
    return (
      <ZStack
        modifiers={[
          frame({ maxWidth: 10_000, maxHeight: 10_000 }),
          background,
          ...opensApp,
        ]}>
        <VStack
          alignment="leading"
          modifiers={[frame({ maxWidth: 10_000, maxHeight: 10_000, alignment: 'topLeading' }), blur(14)]}>
          {content}
        </VStack>
        <VStack spacing={6}>
          <Image systemName="lock.fill" size={20} color={palette.primary} />
          {caption({ text: 'Dotknij, aby odsłonić', color: palette.primary })}
        </VStack>
      </ZStack>
    );
  }

  return (
    <VStack
      alignment="leading"
      modifiers={[
        frame({ maxWidth: 10_000, maxHeight: 10_000, alignment: 'topLeading' }),
        background,
        ...opensApp,
      ]}>
      {content}
    </VStack>
  );
}

export const spendingWidget = createWidget<SpendingWidgetProps, SpendingWidgetConfiguration>(
  'SpendingWidget',
  spendingWidgetLayout,
);

export type SpendingWidget = typeof spendingWidget;
