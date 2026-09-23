import { useAuth } from '@clerk/expo';
import { Image } from 'expo-image';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeInLeft,
  FadeInRight,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  overviewColors,
  overviewSpacing,
} from '@/features/spending-overview/overview-theme';
import { LimitProgressBar } from '@/features/alerts/limit-progress-bar';

interface OnboardingScreenProps {
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
    available: false,
  },
] as const;

const stepCount = 5;
const millenniumShortcutUrl =
  'https://www.icloud.com/shortcuts/3e16ea95fa2f488baffd3cb3b8bf9763';

function pendingReturnKey(userId: string): string {
  return `bankstats.onboarding.shortcuts-return.v1.${userId}`;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { userId } = useAuth();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState<
    'forward' | 'backward'
  >('forward');
  const [selectedBanks, setSelectedBanks] = useState<string[]>(['millennium']);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium'>('free');
  const [isFinishing, setIsFinishing] = useState(false);
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const launchedShortcuts = useRef(false);
  const leftApp = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    progress.value = withTiming(Math.min((step + 1) / stepCount, 1), {
      duration: reduceMotion ? 0 : 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, reduceMotion, step]);

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
          setStep(stepCount);
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
        setStep(stepCount);
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
      setError('Wybierz Millennium albo skonfiguruj przechwytywanie później.');
      return;
    }

    if (Platform.OS !== 'ios') {
      setError('Konfiguracja Skrótów jest dostępna na iPhonie.');
      return;
    }

    setError(null);
    if (userId != null) {
      try {
        await SecureStore.setItemAsync(pendingReturnKey(userId), 'true');
      } catch {
        setError(
          'Nie udało się zapisać postępu konfiguracji. Spróbuj ponownie.',
        );
        return;
      }
    }
    launchedShortcuts.current = true;
    leftApp.current = false;

    try {
      await Linking.openURL(millenniumShortcutUrl);
    } catch {
      launchedShortcuts.current = false;
      if (userId != null) {
        void SecureStore.deleteItemAsync(pendingReturnKey(userId));
      }
      setError(
        'Nie udało się otworzyć skrótu Millennium. Spróbuj ponownie.',
      );
    }
  }, [selectedBanks, userId]);

  const finish = useCallback(async () => {
    setIsFinishing(true);
    setError(null);

    try {
      await onComplete(selectedBanks);
    } catch {
      setError('Nie udało się zapisać konfiguracji. Spróbuj ponownie.');
      setIsFinishing(false);
    }
  }, [onComplete, selectedBanks]);

  const primaryLabel =
    step === 2
      ? selectedPlan === 'free'
        ? 'Kontynuuj za darmo'
        : 'Przejdź do płatności'
      : step === 3
        ? 'Przejdź do konfiguracji'
        : step === 4
          ? 'Dodaj skrót Millennium'
          : step === stepCount
            ? 'Przejdź do aplikacji'
            : 'Dalej';
  const primaryAction =
    step === 4
      ? openShortcuts
      : step === stepCount
        ? finish
        : step === 2 && selectedPlan === 'premium'
          ? () =>
              setError(
                'Płatności Premium będą dostępne wkrótce. Wybierz plan bezpłatny, aby kontynuować.',
              )
          : () => changeStep(step + 1);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        {step > 0 && step < stepCount ? (
          <Pressable
            accessibilityLabel="Wróć do poprzedniego ekranu"
            accessibilityRole="button"
            onPress={() => changeStep(step - 1)}
            style={({ pressed }) => [
              styles.topAction,
              pressed ? styles.pressed : null,
            ]}
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
          </Pressable>
        ) : (
          <View style={styles.topAction} />
        )}
        <Text maxFontSizeMultiplier={1.3} style={styles.stepCount}>
          {step < stepCount ? `${step + 1} / ${stepCount}` : 'Gotowe'}
        </Text>
        {step < 3 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => changeStep(3)}
            style={({ pressed }) => [
              styles.skipAction,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.skipLabel}>Pomiń opis</Text>
          </Pressable>
        ) : (
          <View style={styles.skipAction} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <Animated.View
          entering={
            reduceMotion
              ? undefined
              : transitionDirection === 'forward'
                ? FadeInRight.duration(420).easing(Easing.out(Easing.cubic))
                : FadeInLeft.duration(420).easing(Easing.out(Easing.cubic))
          }
          exiting={reduceMotion ? undefined : FadeOut.duration(180)}
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
          {step === 4 ? (
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
          {step === stepCount ? <CompletionIntro /> : null}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View
          accessibilityLabel={`Postęp konfiguracji: ${Math.min(step + 1, stepCount)} z ${stepCount}`}
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: stepCount,
            now: Math.min(step + 1, stepCount),
          }}
          style={styles.progressTrack}
        >
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
        {error !== null ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={isFinishing || (step === 4 && selectedBanks.length === 0)}
          onPress={() => void primaryAction()}
          style={({ pressed }) => [
            styles.primaryButton,
            isFinishing || (step === 4 && selectedBanks.length === 0)
              ? styles.disabled
              : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.primaryLabel}>
            {isFinishing ? 'Zapisywanie…' : primaryLabel}
          </Text>
          <SymbolView
            name={{
              ios: 'arrow.right',
              android: 'arrow_forward',
              web: 'arrow_forward',
            }}
            size={18}
            tintColor={overviewColors.background}
          />
        </Pressable>
        {step === 4 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => changeStep(stepCount)}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.secondaryLabel}>Skonfiguruję później</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
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
    <View style={styles.heading}>
      <Text maxFontSizeMultiplier={1.4} style={styles.eyebrow}>
        {eyebrow}
      </Text>
      <Text maxFontSizeMultiplier={1.35} style={styles.title}>
        {title}
      </Text>
      <Text maxFontSizeMultiplier={1.5} style={styles.description}>
        {description}
      </Text>
    </View>
  );
}

function FeatureRow({
  symbol,
  title,
  description,
}: {
  symbol:
    'chart.bar.fill' | 'lock.shield.fill' | 'bell.badge.fill' | 'calendar';
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureRow}>
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
    </View>
  );
}

function WelcomeIntro() {
  const pinkOffset = useSharedValue(-1);
  const greenOffset = useSharedValue(1);
  const blueOffset = useSharedValue(-1);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      pinkOffset.value = 0;
      greenOffset.value = 0;
      blueOffset.value = 0;
      return;
    }

    pinkOffset.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    greenOffset.value = withRepeat(
      withTiming(-1, { duration: 4800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    blueOffset.value = withRepeat(
      withTiming(1, { duration: 5400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );

    return () => {
      cancelAnimation(pinkOffset);
      cancelAnimation(greenOffset);
      cancelAnimation(blueOffset);
    };
  }, [blueOffset, greenOffset, pinkOffset, reduceMotion]);

  const pinkStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pinkOffset.value * 7 },
      { translateY: pinkOffset.value * -5 },
    ],
  }));
  const greenStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: greenOffset.value * -6 },
      { translateY: greenOffset.value * 8 },
    ],
  }));
  const blueStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: blueOffset.value * 6 },
      { translateY: blueOffset.value * 5 },
    ],
  }));

  return (
    <View style={styles.stepContent}>
      <View accessible={false} style={styles.orbit}>
        <Animated.View
          style={[styles.orbitCircle, styles.orbitPink, pinkStyle]}
        />
        <Animated.View
          style={[styles.orbitCircle, styles.orbitGreen, greenStyle]}
        />
        <Animated.View
          style={[styles.orbitCircle, styles.orbitBlue, blueStyle]}
        />
      </View>
      <SectionHeading
        eyebrow="WITAJ W BANKSTATS"
        title="Zobacz, dokąd trafiają Twoje pieniądze"
        description="BankStats układa wydatki i wpływy z powiadomień w czytelne statystyki. Bez podawania loginu ani hasła do banku."
      />
      <View style={styles.featureList}>
        <FeatureRow
          symbol="chart.bar.fill"
          title="Wydatki w jednym miejscu"
          description="Przeglądaj sklepy, transakcje i zmiany w czasie."
        />
        <FeatureRow
          symbol="lock.shield.fill"
          title="Masz kontrolę"
          description="Wybierasz, które powiadomienia mogą trafić do aplikacji."
        />
      </View>
    </View>
  );
}

function LimitsIntro() {
  return (
    <View style={styles.stepContent}>
      <View style={styles.limitVisual}>
        <Text style={styles.visualCaption}>TWÓJ LIMIT</Text>
        <View style={styles.visualHeading}>
          <Text style={styles.visualMerchant}>Wybrany sklep</Text>
          <Text style={styles.visualAmount}>400 zł</Text>
        </View>
        <LimitProgressBar share={320 / 400} />
        <Text style={styles.visualMeta}>Przykład: wydano 320 zł z 400 zł</Text>
      </View>
      <SectionHeading
        eyebrow="LIMITY I POWIADOMIENIA"
        title="Ustal kwotę dla sklepu"
        description="Wybierz sklep i kwotę, którą chcesz kontrolować. Powiadomimy Cię, gdy zbliżysz się do limitu lub go osiągniesz."
      />
      <View style={styles.featureList}>
        <FeatureRow
          symbol="bell.badge.fill"
          title="Wiesz wcześniej"
          description="Możesz dostać ostrzeżenie już przy 80% limitu."
        />
        <FeatureRow
          symbol="calendar"
          title="Wybierasz okres"
          description="Limit możesz ustawić na tydzień, miesiąc lub rok."
        />
      </View>
      <Text style={styles.smallNote}>
        Alerty pojawiają się po aktualizacji transakcji w aplikacji. Nie blokują
        płatności.
      </Text>
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
  return (
    <View style={styles.stepContent}>
      <SectionHeading
        eyebrow="WYBIERASZ, JAK KORZYSTASZ"
        title="Wybierz swój plan"
        description="Korzystaj bezpłatnie albo sprawdź, co zaoferuje Premium. Płatności Premium pojawią się wkrótce."
      />
      <Pressable
        accessibilityLabel="Plan bezpłatny, 0 zł, docelowo jeden aktywny limit i miesiąc wydatków"
        accessibilityRole="radio"
        accessibilityState={{ checked: selectedPlan === 'free' }}
        onPress={() => onSelect('free')}
        style={({ pressed }) => [
          styles.planCard,
          selectedPlan === 'free' ? styles.selectedPlanCard : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <View style={styles.planHeading}>
          <Text style={styles.planName}>Bezpłatnie</Text>
          <View style={styles.planHeadingRight}>
            <Text style={styles.planPrice}>0 zł</Text>
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
        <Text style={styles.planDetail}>
          Docelowo: 1 aktywny limit · wykresy i wydatki do 1 miesiąca
        </Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Plan Premium, 9,99 zł miesięcznie lub 99,99 zł rocznie zamiast 119,88 zł, dostępny wkrótce"
        accessibilityRole="radio"
        accessibilityState={{ checked: selectedPlan === 'premium' }}
        onPress={() => onSelect('premium')}
        style={({ pressed }) => [
          styles.planCard,
          styles.premiumCard,
          selectedPlan === 'premium' ? styles.selectedPlanCard : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <View style={styles.planHeading}>
          <Text style={styles.premiumName}>Premium</Text>
          <View style={styles.planHeadingRight}>
            <Text style={styles.comingSoon}>WKRÓTCE</Text>
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
        <Text style={styles.premiumPrice}>9,99 zł / mies.</Text>
        <View style={styles.yearlyPriceRow}>
          <Text style={styles.planDetail}>lub</Text>
          <Text style={styles.oldYearlyPrice}>119,88 zł</Text>
          <Text style={styles.newYearlyPrice}>99,99 zł / rok</Text>
        </View>
        <View style={styles.premiumDivider} />
        <Text style={styles.premiumBenefit}>Nielimitowane aktywne limity</Text>
        <Text style={styles.premiumBenefit}>
          Więcej statystyk i dłuższe zakresy czasu
        </Text>
        <Text style={styles.premiumBenefit}>
          Wspólne konto i kolejne funkcje w planie
        </Text>
      </Pressable>
      <Text style={styles.smallNote}>
        Premium nie można jeszcze kupić. Możesz od razu korzystać z wersji
        bezpłatnej.
      </Text>
    </View>
  );
}

function ShortcutsIntro() {
  const floatOffset = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      floatOffset.value = 0;
      return;
    }

    floatOffset.value = withRepeat(
      withTiming(-6, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );

    return () => cancelAnimation(floatOffset);
  }, [floatOffset, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatOffset.value }],
  }));

  return (
    <View style={styles.stepContent}>
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.shortcutVisual}
      >
        <Animated.View style={animatedStyle}>
          <Image
            contentFit="contain"
            source={require('./assets/shortcuts.png')}
            style={styles.shortcutImage}
          />
        </Animated.View>
      </View>
      <SectionHeading
        eyebrow="JAK DZIAŁA PRZECHWYTYWANIE"
        title="Połącz BankStats ze Skrótami"
        description="Na iPhonie Skróty przekazują powiadomienia o transakcjach do BankStats. To Ty tworzysz i zatwierdzasz automatyzację."
      />
      <View style={styles.warningCard}>
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
          Włącz powiadomienia banku i Portfela Apple. Gdy są wyłączone,
          aplikacja nie otrzyma tych transakcji automatycznie.
        </Text>
      </View>
      <Text style={styles.smallNote}>
        Transakcje nadal możesz dodać ręcznie.
      </Text>
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
  return (
    <View style={styles.stepContent}>
      <SectionHeading
        eyebrow="KONFIGURACJA SKRÓTÓW"
        title="Wybierz banki do konfiguracji"
        description="Zaznacz bank, a potem dodaj gotowy skrót Millennium. Na razie automatyczne przechwytywanie działa tylko dla tego banku."
      />
      <View style={styles.bankList}>
        {banks.map((bank) => {
          const selected = selectedBanks.includes(bank.id);

          return (
            <Pressable
              accessibilityLabel={`${bank.name}${bank.available ? '' : ', wkrótce'}`}
              accessibilityRole="checkbox"
              accessibilityState={{
                checked: selected,
                disabled: !bank.available,
              }}
              disabled={!bank.available}
              key={bank.id}
              onPress={() => onToggle(bank.id)}
              style={({ pressed }) => [
                styles.bankCard,
                pressed ? styles.pressed : null,
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
                <Text style={styles.bankSoon}>Wkrótce</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.stepsCard}>
        <Text style={styles.stepsTitle}>Jak uruchomić przechwytywanie</Text>
        <Text style={styles.stepsLine}>
          1. Otwórz udostępniony skrót i dodaj go do aplikacji Skróty.
        </Text>
        <Text style={styles.stepsLine}>
          2. Utwórz automatyzację dla powiadomień Millennium i Portfela Apple.
        </Text>
        <Text style={styles.stepsLine}>
          3. W automatyzacji uruchom dodany skrót i zatwierdź ją.
        </Text>
      </View>
      <Text style={styles.smallNote}>
        Przycisk otworzy gotowy skrót Millennium. Dodanie skrótu i włączenie
        automatyzacji wymagają Twojego potwierdzenia.
      </Text>
    </View>
  );
}

function CompletionIntro() {
  return (
    <View style={[styles.stepContent, styles.completionContent]}>
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.completionMark}
      >
        <View style={[styles.completionBar, styles.completionBarShort]} />
        <View style={[styles.completionBar, styles.completionBarMedium]} />
        <View style={[styles.completionBar, styles.completionBarTall]} />
      </View>
      <View style={styles.completionHeading}>
        <Text
          maxFontSizeMultiplier={1.35}
          style={[styles.title, styles.completionTitle]}
        >
          Witaj w BankStats
        </Text>
        <Text
          maxFontSizeMultiplier={1.5}
          style={[styles.description, styles.completionDescription]}
        >
          Twoje finanse w jednym miejscu. Dodaj pierwszą transakcję i zacznij
          poznawać swoje wydatki.
        </Text>
      </View>
      <View style={styles.completionNote}>
        <Text maxFontSizeMultiplier={1.4} style={styles.completionNoteTitle}>
          Transakcje ze Skrótów
        </Text>
        <Text maxFontSizeMultiplier={1.5} style={styles.completionNoteText}>
          Będą dodawane automatycznie po zapisaniu i włączeniu automatyzacji
          w aplikacji Skróty. Możesz też dodawać je ręcznie.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: overviewColors.background },
  topBar: {
    minHeight: 60,
    paddingHorizontal: overviewSpacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topAction: { width: 64, minHeight: 44, justifyContent: 'center' },
  skipAction: {
    minWidth: 64,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  skipLabel: {
    color: overviewColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  stepCount: {
    color: overviewColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  progressTrack: {
    height: 4,
    marginBottom: 12,
    backgroundColor: overviewColors.surfacePressed,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: overviewColors.positive,
    borderRadius: 4,
  },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: 24,
    paddingBottom: 24,
  },
  page: { width: '100%' },
  stepContent: { gap: 24, width: '100%', maxWidth: 540, alignSelf: 'center' },
  heading: { gap: 12 },
  eyebrow: {
    color: overviewColors.positive,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  title: {
    color: overviewColors.textPrimary,
    fontSize: 35,
    fontWeight: '700',
    letterSpacing: -1.3,
    lineHeight: 40,
  },
  description: {
    color: overviewColors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    gap: 8,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: 12,
    backgroundColor: overviewColors.background,
  },
  primaryButton: {
    minHeight: 56,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: overviewColors.positive,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryLabel: {
    color: overviewColors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    color: overviewColors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  error: { color: overviewColors.negative, fontSize: 14, lineHeight: 20 },
  orbit: { width: 200, height: 180, alignSelf: 'center', marginVertical: 12 },
  orbitCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.85,
  },
  orbitPink: { left: 25, top: 5, backgroundColor: '#FF5C8A' },
  orbitGreen: { left: 75, top: 47, backgroundColor: '#3DE8A0', opacity: 0.7 },
  orbitBlue: { left: 15, top: 65, backgroundColor: '#8F7BFF', opacity: 0.75 },
  featureList: { gap: 18 },
  featureRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  featureIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: overviewColors.surfacePressed,
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
  limitVisual: {
    gap: 15,
    padding: 22,
    borderRadius: 26,
    backgroundColor: overviewColors.surfacePressed,
    marginVertical: 16,
  },
  visualCaption: {
    color: overviewColors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  visualHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  visualMerchant: {
    color: overviewColors.textPrimary,
    fontSize: 19,
    fontWeight: '600',
  },
  visualAmount: {
    color: overviewColors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  visualMeta: { color: overviewColors.textSecondary, fontSize: 13 },
  smallNote: {
    color: overviewColors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  planCard: {
    gap: 9,
    minHeight: 88,
    padding: 18,
    borderRadius: 20,
    backgroundColor: overviewColors.surface,
    borderWidth: 1,
    borderColor: overviewColors.hairline,
  },
  premiumCard: {
    backgroundColor: overviewColors.surfacePressed,
  },
  selectedPlanCard: {
    borderColor: overviewColors.positive,
  },
  planHeading: {
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
    borderColor: overviewColors.positive,
    backgroundColor: overviewColors.positive,
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
    color: overviewColors.positive,
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
    color: overviewColors.positive,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  premiumDivider: {
    height: 1,
    marginVertical: 5,
    backgroundColor: overviewColors.hairline,
  },
  premiumBenefit: {
    color: overviewColors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  shortcutVisual: {
    width: '100%',
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  shortcutImage: { width: 184, height: 184 },
  warningCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: overviewColors.surfacePressed,
  },
  warningText: {
    flex: 1,
    color: overviewColors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },
  bankList: { gap: 8 },
  bankCard: {
    minHeight: 68,
    paddingHorizontal: 16,
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
    backgroundColor: overviewColors.positive,
    borderColor: overviewColors.positive,
  },
  bankLogo: {
    width: 30,
    height: 30,
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
    gap: 9,
    padding: 18,
    borderRadius: 18,
    backgroundColor: overviewColors.surfacePressed,
  },
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
  completionContent: {
    alignItems: 'center',
    gap: 32,
    paddingVertical: 24,
  },
  completionMark: {
    height: 96,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 8,
  },
  completionBar: {
    width: 24,
    borderRadius: 12,
    backgroundColor: overviewColors.positive,
  },
  completionBarShort: { height: 40, opacity: 0.4 },
  completionBarMedium: { height: 64, opacity: 0.7 },
  completionBarTall: { height: 88 },
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
