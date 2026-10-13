import { useAuth } from '@clerk/expo';
import { Image } from 'expo-image';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  overviewColors,
  overviewSpacing,
} from '@/features/spending-overview/overview-theme';
import { AnimatedReveal } from '@/features/app-shell/animated-reveal';
import { ScalePressable } from '@/features/app-shell/scale-pressable';
import { useCopy } from '@/features/localization/language';
import { biometricLabels } from '@/features/privacy/biometrics';
import { PinSetup } from '@/features/privacy/pin-setup';
import { usePrivacy } from '@/features/privacy/privacy-provider';

import { onboardingCopy } from './onboarding-copy';
import {
  CompletionIllustration,
  LimitsIllustration,
  OnboardingIcon,
  SecurityIllustration,
  ShortcutsIllustration,
  WelcomeIllustration,
} from './onboarding-illustrations';
import {
  onboardingColors,
  onboardingMotion,
} from './onboarding-motion';
import { readSelectedBanks } from './selected-banks';
import { shortcutUrlFor } from './shortcut-links';

interface OnboardingScreenProps {
  flow: 'full' | 'shortcuts';
  onCancel: () => void;
  onComplete: (selectedBanks: string[]) => Promise<void>;
}

const banks = [
  {
    id: 'millennium',
    name: 'Millennium',
    logo: require('./assets/millennium.png'),
    available: true,
  },
  {
    id: 'mbank',
    name: 'mBank',
    logo: require('./assets/mbank.png'),
    available: false,
  },
  {
    id: 'revolut',
    name: 'Revolut',
    logo: require('./assets/revolut.png'),
    available: false,
  },
  {
    id: 'pko',
    name: 'PKO BP',
    logo: require('./assets/pko.png'),
    available: true,
  },
  {
    id: 'ing',
    name: 'ING',
    logo: require('./assets/ing.png'),
    available: true,
  },
] as const;

const banksStep = 4;
const automationStep = 5;
const pinStep = 6;
const stepCount = 7;
const shortcutsAppUrl = 'shortcuts://';
function pendingReturnKey(userId: string): string {
  return `bankstats.onboarding.shortcuts-return.v1.${userId}`;
}

export function OnboardingScreen({ flow, onCancel, onComplete }: OnboardingScreenProps) {
  const copy = useCopy(onboardingCopy);
  const { userId } = useAuth();
  const { biometric, changePin, updateSettings } = usePrivacy();
  const insets = useSafeAreaInsets();
  const isShortcutsFlow = flow === 'shortcuts';
  const [step, setStep] = useState(isShortcutsFlow ? banksStep : 0);
  const [transitionDirection, setTransitionDirection] = useState<
    'forward' | 'backward'
  >('forward');
  const [selectedBanks, setSelectedBanks] = useState<string[]>(['millennium']);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium'>('free');
  const [isFinishing, setIsFinishing] = useState(false);
  const progress = useSharedValue(0);
  const launchedShortcuts = useRef(false);
  const leftApp = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const flowStart = isShortcutsFlow ? banksStep : 0;
  const flowLength = isShortcutsFlow ? automationStep - banksStep + 1 : stepCount;
  const flowPosition = Math.min(step - flowStart + 1, flowLength);

  useEffect(() => {
    progress.value = withTiming(flowPosition / flowLength, {
      duration: 420,
      reduceMotion: ReduceMotion.System,
      easing: Easing.out(Easing.cubic),
    });
  }, [flowLength, flowPosition, progress]);

  useEffect(() => {
    if (!isShortcutsFlow || userId == null) {
      return;
    }

    let isActive = true;

    void readSelectedBanks(userId).then((savedBanks) => {
      if (isActive && savedBanks.length > 0) {
        setSelectedBanks(savedBanks);
      }
    });

    return () => {
      isActive = false;
    };
  }, [isShortcutsFlow, userId]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as `${number}%`,
  }));

  useEffect(() => {
    if (userId == null) {
      return;
    }

    let isActive = true;

    void SecureStore.getItemAsync(pendingReturnKey(userId))
      .then((value) => {
        if (isActive && value === 'true') {
          setStep(automationStep);
          void SecureStore.deleteItemAsync(pendingReturnKey(userId));
        }
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [userId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (!launchedShortcuts.current) {
        return;
      }

      if (state === 'background') {
        leftApp.current = true;
      } else if (state === 'active' && leftApp.current) {
        launchedShortcuts.current = false;
        leftApp.current = false;
        setStep(automationStep);
        if (userId != null) {
          void SecureStore.deleteItemAsync(pendingReturnKey(userId));
        }
      }
    });

    return () => subscription.remove();
  }, [userId]);

  const changeStep = useCallback(
    (next: number) => {
      setError(null);
      setTransitionDirection(next >= step ? 'forward' : 'backward');
      setStep(next);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    },
    [step],
  );

  const openShortcuts = useCallback(async () => {
    if (selectedBanks.length === 0) {
      setError(copy.chooseBank);
      return;
    }

    if (Platform.OS !== 'ios') {
      setError(copy.shortcutsIphoneOnly);
      return;
    }

    const shortcutUrl = shortcutUrlFor(selectedBanks);

    if (shortcutUrl === null) {
      setError(copy.shortcutUnavailable);
      return;
    }

    setError(null);
    if (userId != null) {
      try {
        await SecureStore.setItemAsync(pendingReturnKey(userId), 'true');
      } catch {
        setError(copy.progressSaveFailed);
        return;
      }
    }
    launchedShortcuts.current = true;
    leftApp.current = false;

    try {
      await Linking.openURL(shortcutUrl);
    } catch {
      launchedShortcuts.current = false;
      if (userId != null) {
        void SecureStore.deleteItemAsync(pendingReturnKey(userId));
      }
      setError(copy.shortcutOpenFailed);
    }
  }, [copy, selectedBanks, userId]);

  const finish = useCallback(async () => {
    setIsFinishing(true);
    setError(null);

    try {
      await onComplete(selectedBanks);
    } catch {
      setError(copy.finishFailed);
      setIsFinishing(false);
    }
  }, [copy, onComplete, selectedBanks]);

  const protectWithPin = useCallback(
    async (pin: string) => {
      await changePin(pin);
      await updateSettings({ isLockEnabled: true });
      changeStep(stepCount);
    },
    [changePin, changeStep, updateSettings],
  );

  const isPrimaryDisabled = isFinishing || (step === banksStep && selectedBanks.length === 0);

  const primaryLabel =
    step === 2
      ? selectedPlan === 'free'
        ? copy.continueFree
        : copy.goToPayment
      : step === 3
        ? copy.goToSetup
        : step === banksStep
          ? copy.addShortcut
          : step === automationStep
            ? copy.automationEnabled
            : step === stepCount
              ? copy.goToApp
              : copy.next;
  const primaryAction =
    step === banksStep
      ? openShortcuts
      : step === stepCount || (isShortcutsFlow && step === automationStep)
        ? finish
        : step === 2 && selectedPlan === 'premium'
          ? () =>
              setError(copy.premiumSoon)
          : () => changeStep(step + 1);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={[styles.topBar, { paddingTop: insets.top + 12, paddingLeft: Math.max(insets.left, 20), paddingRight: Math.max(insets.right, 20) }]}>
        {step > 0 && step < stepCount ? (
          <ScalePressable
            accessibilityLabel={copy.back}
            accessibilityRole="button"
            onPress={() =>
              isShortcutsFlow && step === banksStep ? onCancel() : changeStep(step - 1)
            }
            style={styles.topAction}
          >
            <SymbolView
              name={{
                ios: 'chevron.left',
                android: 'arrow_back',
                web: 'arrow_back',
              }}
              size={18}
              tintColor={overviewColors.textPrimary}
            />
          </ScalePressable>
        ) : (
          <View style={styles.topAction} />
        )}
        <Text maxFontSizeMultiplier={1.3} style={styles.stepCount}>
          {step < stepCount ? `${flowPosition} / ${flowLength}` : copy.done}
        </Text>
        {step < 3 ? (
          <ScalePressable
            accessibilityRole="button"
            onPress={() => changeStep(3)}
            style={styles.skipAction}
          >
            <Text style={styles.skipLabel}>{copy.skipIntro}</Text>
          </ScalePressable>
        ) : (
          <View style={styles.skipAction} />
        )}
      </View>

      <View style={styles.progressContainer}>
        <View
          accessibilityLabel={copy.progress(flowPosition, flowLength)}
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: flowLength,
            now: flowPosition,
          }}
          style={styles.progressTrack}
        >
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingLeft: Math.max(insets.left, 20), paddingRight: Math.max(insets.right, 20) }]}
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <AnimatedReveal
          direction={transitionDirection === 'forward' ? 'right' : 'left'}
          distance={18}
          duration={320}
          key={step}
          style={styles.page}
        >
          {step === 0 ? <WelcomeIntro /> : null}
          {step === 1 ? <LimitsIntro /> : null}
          {step === 2 ? (
            <PremiumIntro
              onSelect={(plan) => {
                setSelectedPlan(plan);
                setError(null);
              }}
              selectedPlan={selectedPlan}
            />
          ) : null}
          {step === 3 ? <ShortcutsIntro /> : null}
          {step === banksStep ? (
            <BanksSetup
              onToggle={(bankId) =>
                setSelectedBanks((current) =>
                  current.includes(bankId)
                    ? current.filter((id) => id !== bankId)
                    : [...current, bankId],
                )
              }
              selectedBanks={selectedBanks}
            />
          ) : null}
          {step === automationStep ? <AutomationSetup /> : null}
          {step === pinStep ? (
            <PinIntro
              biometricName={biometric === 'none' ? null : biometricLabels[biometric]}
              onComplete={protectWithPin}
            />
          ) : null}
          {step === stepCount ? <CompletionIntro /> : null}
        </AnimatedReveal>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 12, paddingLeft: Math.max(insets.left, 20), paddingRight: Math.max(insets.right, 20) }]}>
        {error !== null ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
        {step !== pinStep ? (
          <ScalePressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isPrimaryDisabled, busy: isFinishing }}
            containerStyle={isPrimaryDisabled && styles.disabled}
            disabled={isPrimaryDisabled}
            onPress={() => void primaryAction()}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryLabel}>
              {isFinishing ? copy.saving : primaryLabel}
            </Text>
            {isFinishing ? (
              <ActivityIndicator color={overviewColors.background} size="small" />
            ) : (
              <SymbolView
                name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
                size={18}
                tintColor={overviewColors.background}
              />
            )}
          </ScalePressable>
        ) : (
          <ScalePressable
            accessibilityRole="button"
            onPress={() => changeStep(stepCount)}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryLabel}>{copy.notNow}</Text>
          </ScalePressable>
        )}
        {step === banksStep ? (
          <ScalePressable
            accessibilityRole="button"
            onPress={() => (isShortcutsFlow ? onCancel() : changeStep(pinStep))}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryLabel}>{copy.setUpLater}</Text>
          </ScalePressable>
        ) : null}
        {step === automationStep ? (
          <ScalePressable
            accessibilityRole="button"
            onPress={() => void Linking.openURL(shortcutsAppUrl).catch(() => undefined)}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryLabel}>{copy.openShortcuts}</Text>
          </ScalePressable>
        ) : null}
      </View>
    </View>
  );
}

function SelectionCard({
  selected,
  delay = 0,
  style,
  children,
  ...props
}: ComponentProps<typeof ScalePressable> & { selected: boolean; delay?: number }) {
  const selection = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    selection.set(withTiming(selected ? 1 : 0, onboardingMotion.selection));
  }, [selected, selection]);

  const selectionStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(selection.get(), [0, 1], [overviewColors.hairline, onboardingColors.accent]),
    backgroundColor: interpolateColor(selection.get(), [0, 1], [overviewColors.surface, onboardingColors.accentMuted]),
  }));

  return (
    <AnimatedReveal delay={delay}>
      <ScalePressable {...props} pressedScale={0.985}>
        <Animated.View style={[style, selectionStyle]}>{children}</Animated.View>
      </ScalePressable>
    </AnimatedReveal>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <AnimatedReveal delay={60} style={styles.heading}>
      <Text maxFontSizeMultiplier={1.4} style={styles.eyebrow}>
        {eyebrow}
      </Text>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.description}>
        {description}
      </Text>
    </AnimatedReveal>
  );
}

function FeatureRow({
  delay = 140,
  symbol,
  title,
  description,
}: {
  delay?: number;
  symbol:
    'chart.bar.fill' | 'lock.shield.fill' | 'bell.badge.fill' | 'calendar';
  title: string;
  description: string;
}) {
  return (
    <AnimatedReveal delay={delay} style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <SymbolView
          name={{ ios: symbol, android: 'check_circle', web: 'check_circle' }}
          size={19}
          tintColor={overviewColors.positive}
        />
      </View>
      <View style={styles.featureCopy}>
        <Text maxFontSizeMultiplier={1.4} style={styles.featureTitle}>
          {title}
        </Text>
        <Text maxFontSizeMultiplier={1.5} style={styles.featureDescription}>
          {description}
        </Text>
      </View>
    </AnimatedReveal>
  );
}

function WelcomeIntro() {
  const copy = useCopy(onboardingCopy).welcome;

  return (
    <View style={styles.stepContent}>
      <WelcomeIllustration />
      <SectionHeading
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <View style={styles.featureList}>
        <FeatureRow
          symbol="chart.bar.fill"
          title={copy.spendingTitle}
          description={copy.spendingDescription}
        />
        <FeatureRow
          delay={220}
          symbol="lock.shield.fill"
          title={copy.controlTitle}
          description={copy.controlDescription}
        />
      </View>
    </View>
  );
}

function LimitsIntro() {
  const copy = useCopy(onboardingCopy).limits;
  return (
    <View style={styles.stepContent}>
      <LimitsIllustration />
      <SectionHeading
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <View style={styles.featureList}>
        <FeatureRow
          symbol="bell.badge.fill"
          title={copy.earlyTitle}
          description={copy.earlyDescription}
        />
        <FeatureRow
          delay={220}
          symbol="calendar"
          title={copy.periodTitle}
          description={copy.periodDescription}
        />
      </View>
      <Text style={styles.smallNote}>{copy.note}</Text>
    </View>
  );
}

function PremiumIntro({
  onSelect,
  selectedPlan,
}: {
  onSelect: (plan: 'free' | 'premium') => void;
  selectedPlan: 'free' | 'premium';
}) {
  const copy = useCopy(onboardingCopy).plans;
  return (
    <View style={styles.stepContent}>
      <SectionHeading
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <SelectionCard
        selected={selectedPlan === 'free'}
        delay={120}
        accessibilityLabel={copy.freeLabel}
        accessibilityRole="radio"
        accessibilityState={{ checked: selectedPlan === 'free' }}
        onPress={() => onSelect('free')}
        style={styles.planCard}
      >
        <View style={styles.planHeading}>
          <Text style={styles.planName}>{copy.freeName}</Text>
          <View style={styles.planHeadingRight}>
            <Text style={styles.planPrice}>{copy.freePrice}</Text>
            <View
              style={[
                styles.planCheck,
                selectedPlan === 'free' ? styles.planCheckSelected : null,
              ]}
            >
              {selectedPlan === 'free' ? (
                <SymbolView
                  name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                  size={13}
                  tintColor={overviewColors.background}
                />
              ) : null}
            </View>
          </View>
        </View>
        <Text style={styles.planDetail}>{copy.freeDetail}</Text>
      </SelectionCard>
      <SelectionCard
        selected={selectedPlan === 'premium'}
        delay={180}
        accessibilityLabel={copy.premiumLabel}
        accessibilityRole="radio"
        accessibilityState={{ checked: selectedPlan === 'premium' }}
        onPress={() => onSelect('premium')}
        style={[
          styles.planCard,
          styles.premiumCard,
        ]}
      >
        <View style={styles.planHeading}>
          <Text style={styles.premiumName}>Premium</Text>
          <View style={styles.planHeadingRight}>
            <Text style={styles.comingSoon}>{copy.comingSoon}</Text>
            <View
              style={[
                styles.planCheck,
                selectedPlan === 'premium' ? styles.planCheckSelected : null,
              ]}
            >
              {selectedPlan === 'premium' ? (
                <SymbolView
                  name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                  size={13}
                  tintColor={overviewColors.background}
                />
              ) : null}
            </View>
          </View>
        </View>
        <Text style={styles.premiumPrice}>{copy.monthlyPrice}</Text>
        <View style={styles.yearlyPriceRow}>
          <Text style={styles.planDetail}>{copy.or}</Text>
          <Text style={styles.oldYearlyPrice}>{copy.oldYearlyPrice}</Text>
          <Text style={styles.newYearlyPrice}>{copy.yearlyPrice}</Text>
        </View>
        <View style={styles.premiumDivider} />
        {[copy.unlimitedLimits, copy.moreStatistics, copy.sharedAccount].map((benefit) => (
          <View key={benefit} style={styles.benefitRow}>
            <OnboardingIcon name="check" size={16} />
            <Text style={styles.premiumBenefit}>{benefit}</Text>
          </View>
        ))}
      </SelectionCard>
      <Text style={styles.smallNote}>{copy.note}</Text>
    </View>
  );
}

function ShortcutsIntro() {
  const copy = useCopy(onboardingCopy).shortcuts;

  return (
    <View style={styles.stepContent}>
      <ShortcutsIllustration />
      <SectionHeading
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <AnimatedReveal delay={180} style={styles.warningCard}>
        <SymbolView
          name={{
            ios: 'bell.slash.fill',
            android: 'notifications_off',
            web: 'notifications_off',
          }}
          size={20}
          tintColor={overviewColors.caution}
        />
        <Text maxFontSizeMultiplier={1.5} style={styles.warningText}>
          {copy.warning}
        </Text>
      </AnimatedReveal>
      <Text style={styles.smallNote}>{copy.manualNote}</Text>
    </View>
  );
}

function BanksSetup({
  onToggle,
  selectedBanks,
}: {
  onToggle: (bankId: string) => void;
  selectedBanks: string[];
}) {
  const copy = useCopy(onboardingCopy).banks;
  return (
    <View style={styles.stepContent}>
      <SectionHeading
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <View style={styles.bankList}>
        {banks.map((bank, index) => {
          const selected = selectedBanks.includes(bank.id);

          return (
            <SelectionCard
              selected={selected}
              delay={100 + index * 50}
              accessibilityLabel={`${bank.name}${bank.available ? '' : copy.soonSuffix}`}
              accessibilityRole="checkbox"
              accessibilityState={{
                checked: selected,
                disabled: !bank.available,
              }}
              disabled={!bank.available}
              key={bank.id}
              onPress={() => onToggle(bank.id)}
              style={[
                styles.bankCard,
                !bank.available && styles.unavailableBank,
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  selected ? styles.checkboxSelected : null,
                ]}
              >
                {selected ? (
                  <SymbolView
                    name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                    size={14}
                    tintColor={overviewColors.background}
                  />
                ) : null}
              </View>
              <Image
                accessible={false}
                contentFit="cover"
                source={bank.logo}
                style={styles.bankLogo}
              />
              <Text maxFontSizeMultiplier={1.4} style={styles.bankName}>
                {bank.name}
              </Text>
              {!bank.available ? (
                <Text style={styles.bankSoon}>{copy.soon}</Text>
              ) : null}
            </SelectionCard>
          );
        })}
      </View>
      <AnimatedReveal delay={300} style={styles.stepsCard}>
        <Text style={styles.stepsTitle}>{copy.stepsTitle}</Text>
        <Text style={styles.stepsLine}>{copy.stepOne}</Text>
        <Text style={styles.stepsLine}>{copy.stepTwo}</Text>
      </AnimatedReveal>
      <Text style={styles.smallNote}>{copy.note}</Text>
    </View>
  );
}

function InstructionCard({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <AnimatedReveal delay={number * 100} style={styles.stepsCard}>
      <View style={styles.instructionHeading}>
        <View style={styles.instructionNumber}><Text style={styles.instructionNumberText}>{number}</Text></View>
        <Text style={[styles.stepsTitle, styles.instructionTitle]}>{title.replace(/^\d+\.\s*/, '')}</Text>
      </View>
      {children}
    </AnimatedReveal>
  );
}

function AutomationSetup() {
  const copy = useCopy(onboardingCopy).automation;
  return (
    <View style={styles.stepContent}>
      <SectionHeading
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <InstructionCard number={1} title={copy.stepOne}>
        <Image
          accessible={false}
          contentFit="contain"
          source={require('./assets/shortcuts-step-automation-tab.png')}
          style={[styles.stepScreenshot, styles.automationTabScreenshot]}
        />
      </InstructionCard>
      <InstructionCard number={2} title={copy.stepTwo}>
        <Image
          accessible={false}
          contentFit="contain"
          source={require('./assets/shortcuts-step-enable-toggle.png')}
          style={[styles.stepScreenshot, styles.enableToggleScreenshot]}
        />
      </InstructionCard>
    </View>
  );
}

function PinIntro({
  biometricName,
  onComplete,
}: {
  biometricName: string | null;
  onComplete: (pin: string) => Promise<void>;
}) {
  const copy = useCopy(onboardingCopy).pin;
  const { height, fontScale } = useWindowDimensions();
  return (
    <View style={styles.stepContent}>
      {height >= 900 && fontScale <= 1.2 ? <SecurityIllustration /> : null}
      <SectionHeading
        description={
          biometricName === null ? copy.pinOnly : copy.withBiometric(biometricName)
        }
        eyebrow={copy.eyebrow}
        title={copy.title}
      />
      <PinSetup onComplete={onComplete} />
    </View>
  );
}

function CompletionIntro() {
  const copy = useCopy(onboardingCopy).completion;
  return (
    <View style={[styles.stepContent, styles.completionContent]}>
      <CompletionIllustration />
      <View style={styles.completionHeading}>
        <Text
          maxFontSizeMultiplier={1.35}
          style={[styles.title, styles.completionTitle]}
        >
          {copy.title}
        </Text>
        <Text
          maxFontSizeMultiplier={1.5}
          style={[styles.description, styles.completionDescription]}
        >
          {copy.description}
        </Text>
      </View>
      <AnimatedReveal delay={280} style={styles.completionNote}>
        <Text maxFontSizeMultiplier={1.4} style={styles.completionNoteTitle}>
          {copy.noteTitle}
        </Text>
        <Text maxFontSizeMultiplier={1.5} style={styles.completionNoteText}>
          {copy.noteText}
        </Text>
      </AnimatedReveal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: overviewColors.background },
  topBar: {
    minHeight: 60,
    width: '100%',
    maxWidth: 580,
    alignSelf: 'center',
    paddingHorizontal: overviewSpacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topAction: { width: 64, minHeight: 48, justifyContent: 'center' },
  skipAction: {
    minWidth: 64,
    minHeight: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  skipLabel: {
    color: overviewColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  stepCount: {
    color: onboardingColors.accentText,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: onboardingColors.accentMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  progressContainer: { width: '100%', maxWidth: 580, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 8 },
  progressTrack: {
    height: 4,
    backgroundColor: overviewColors.surfacePressed,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: onboardingColors.accent,
    borderRadius: 4,
  },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: 28,
    paddingBottom: 28,
  },
  page: { width: '100%' },
  stepContent: { gap: 24, width: '100%', maxWidth: 540, alignSelf: 'center' },
  heading: { gap: 12 },
  eyebrow: {
    color: onboardingColors.accentText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  title: {
    color: overviewColors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 38,
  },
  description: {
    color: overviewColors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    width: '100%',
    maxWidth: 580,
    alignSelf: 'center',
    gap: 8,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: 12,
    backgroundColor: overviewColors.background,
  },
  primaryButton: {
    minHeight: 56,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
    borderRadius: 18,
    backgroundColor: onboardingColors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryLabel: {
    flexShrink: 1,
    color: overviewColors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    textAlign: 'center',
    color: overviewColors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: { opacity: 0.4 },
  error: { color: overviewColors.negative, fontSize: 14, lineHeight: 20 },
  featureList: { gap: 12 },
  featureRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', padding: 16, borderRadius: 20, backgroundColor: overviewColors.surface, borderWidth: 1, borderColor: overviewColors.hairline },
  featureIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: onboardingColors.positiveMuted,
  },
  featureCopy: { flex: 1, gap: 4 },
  featureTitle: {
    color: overviewColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  featureDescription: {
    color: overviewColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  smallNote: {
    color: overviewColors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  planCard: {
    gap: 9,
    minHeight: 88,
    padding: 20,
    borderRadius: 22,
    backgroundColor: overviewColors.surface,
    borderWidth: 1,
    borderColor: overviewColors.hairline,
  },
  premiumCard: {
    backgroundColor: overviewColors.surfacePressed,
  },
  planHeading: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  planHeadingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: overviewColors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCheckSelected: {
    borderColor: onboardingColors.accent,
    backgroundColor: onboardingColors.accent,
  },
  planName: {
    color: overviewColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  planPrice: {
    color: overviewColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  planDetail: {
    color: overviewColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  premiumName: {
    color: onboardingColors.accentText,
    fontSize: 18,
    fontWeight: '700',
  },
  premiumPrice: {
    color: overviewColors.textPrimary,
    fontSize: 26,
    fontWeight: '700',
  },
  yearlyPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 7,
  },
  oldYearlyPrice: {
    color: overviewColors.textSecondary,
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  newYearlyPrice: {
    color: overviewColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  comingSoon: {
    color: onboardingColors.accentText,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: onboardingColors.accentMuted,
    overflow: 'hidden',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  premiumDivider: {
    height: 1,
    marginVertical: 5,
    backgroundColor: overviewColors.hairline,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  premiumBenefit: {
    flex: 1,
    color: overviewColors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  warningCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: onboardingColors.cautionMuted,
    borderWidth: 1,
    borderColor: overviewColors.hairline,
  },
  warningText: {
    flex: 1,
    color: overviewColors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },
  bankList: { gap: 12 },
  unavailableBank: { opacity: 0.55 },
  bankCard: {
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: overviewColors.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    backgroundColor: overviewColors.surface,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: overviewColors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: onboardingColors.accent,
    borderColor: onboardingColors.accent,
  },
  bankLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: overviewColors.textPrimary,
  },
  bankName: {
    flex: 1,
    color: overviewColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  bankSoon: {
    color: overviewColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  stepsCard: {
    gap: 16,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  instructionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  instructionNumber: { width: 32, height: 32, borderRadius: 12, backgroundColor: onboardingColors.accentMuted, alignItems: 'center', justifyContent: 'center' },
  instructionNumberText: { color: onboardingColors.accentText, fontSize: 14, fontWeight: '700' },
  instructionTitle: { flex: 1 },
  stepsTitle: {
    color: overviewColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  stepsLine: {
    color: overviewColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  stepScreenshot: {
    width: '100%',
    marginTop: 4,
    marginBottom: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.background,
  },
  automationTabScreenshot: { aspectRatio: 786 / 650 },
  enableToggleScreenshot: { aspectRatio: 786 / 913 },
  completionContent: {
    alignItems: 'center',
    gap: 32,
    paddingVertical: 24,
  },
  completionHeading: { alignItems: 'center', gap: 16 },
  completionTitle: { textAlign: 'center' },
  completionDescription: { textAlign: 'center', maxWidth: 320 },
  completionNote: {
    width: '100%',
    maxWidth: 340,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: overviewColors.hairline,
    paddingTop: 24,
    gap: 8,
  },
  completionNoteTitle: {
    color: overviewColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  completionNoteText: {
    color: overviewColors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});
