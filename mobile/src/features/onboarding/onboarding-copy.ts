import { defineCopy } from '@/features/app-shell/localization/language';

export const onboardingCopy = defineCopy({
  pl: {
    chooseBank: 'Wybierz Millennium, PKO BP, ING lub mBank albo skonfiguruj przechwytywanie później.',
    shortcutUnavailable: 'Skrót dla tego zestawu banków będzie dostępny wkrótce. Zmień wybór albo skonfiguruj przechwytywanie później.',
    shortcutsIphoneOnly: 'Konfiguracja Skrótów jest dostępna na iPhonie.',
    progressSaveFailed: 'Nie udało się zapisać postępu konfiguracji. Spróbuj ponownie.',
    shortcutOpenFailed: 'Nie udało się otworzyć skrótu. Spróbuj ponownie.',
    finishFailed: 'Nie udało się zapisać konfiguracji. Spróbuj ponownie.',
    continueFree: 'Kontynuuj za darmo',
    goToPayment: 'Przejdź do płatności',
    goToSetup: 'Przejdź do konfiguracji',
    addShortcut: 'Dodaj skrót',
    addShortcutAgain: 'Dodaj skrót ponownie',
    shortcutAdded: 'Skrót dodany — dalej',
    openingShortcut: 'Otwieranie Skrótów…',
    automationEnabled: 'Automatyzacja włączona',
    showFocusSetup: 'Pokaż, jak to ustawić',
    focusConfigured: 'Wyjątki dodane',
    openShortcuts: 'Otwórz Skróty',
    goToApp: 'Przejdź do aplikacji',
    next: 'Dalej',
    premiumSoon:
      'Płatności Premium będą dostępne wkrótce. Wybierz plan bezpłatny, aby kontynuować.',
    back: 'Wróć do poprzedniego ekranu',
    done: 'Gotowe',
    skipIntro: 'Pomiń opis',
    progress: (step: number, count: number) => `Postęp konfiguracji: ${step} z ${count}`,
    saving: 'Zapisywanie…',
    notNow: 'Nie teraz',
    setUpLater: 'Skonfiguruję później',
    welcome: {
      eyebrow: 'WITAJ W BANKSTATS',
      title: 'Zobacz, dokąd trafiają Twoje pieniądze',
      description:
        'BankStats układa wydatki i wpływy z powiadomień w czytelne statystyki. Bez podawania loginu ani hasła do banku.',
      spendingTitle: 'Wydatki w jednym miejscu',
      spendingDescription: 'Przeglądaj sklepy, transakcje i zmiany w czasie.',
      controlTitle: 'Masz kontrolę',
      controlDescription: 'Wybierasz, które powiadomienia mogą trafić do aplikacji.',
    },
    limits: {
      caption: 'TWÓJ LIMIT',
      merchant: 'Wybrany sklep',
      amount: '400 zł',
      example: 'Przykład: wydano 320 zł z 400 zł',
      alertPreview: 'Zbliżasz się do limitu',
      eyebrow: 'LIMITY I POWIADOMIENIA',
      title: 'Ustal kwotę dla sklepu',
      description:
        'Wybierz sklep i kwotę, którą chcesz kontrolować. Powiadomimy Cię, gdy zbliżysz się do limitu lub go osiągniesz.',
      earlyTitle: 'Wiesz wcześniej',
      earlyDescription: 'Możesz dostać ostrzeżenie już przy 80% limitu.',
      periodTitle: 'Wybierasz okres',
      periodDescription: 'Limit możesz ustawić na tydzień, miesiąc lub rok.',
      note: 'Alerty pojawiają się po aktualizacji transakcji w aplikacji. Nie blokują płatności.',
    },
    plans: {
      eyebrow: 'WYBIERASZ, JAK KORZYSTASZ',
      title: 'Wybierz swój plan',
      description:
        'Korzystaj bezpłatnie albo sprawdź, co zaoferuje Premium. Płatności Premium pojawią się wkrótce.',
      freeLabel: 'Plan bezpłatny, 0 zł, docelowo jeden aktywny limit i miesiąc wydatków',
      freeName: 'Bezpłatnie',
      freePrice: '0 zł',
      freeDetail: 'Docelowo: 1 aktywny limit · wykresy i wydatki do 1 miesiąca',
      premiumLabel:
        'Plan Premium, 9,99 zł miesięcznie lub 99,99 zł rocznie zamiast 119,88 zł, dostępny wkrótce',
      comingSoon: 'WKRÓTCE',
      monthlyPrice: '9,99 zł / mies.',
      or: 'lub',
      oldYearlyPrice: '119,88 zł',
      yearlyPrice: '99,99 zł / rok',
      unlimitedLimits: 'Nielimitowane aktywne limity',
      moreStatistics: 'Więcej statystyk i dłuższe zakresy czasu',
      note: 'Premium nie można jeszcze kupić. Możesz od razu korzystać z wersji bezpłatnej.',
    },
    shortcuts: {
      eyebrow: 'JAK DZIAŁA PRZECHWYTYWANIE',
      title: 'Połącz BankStats ze Skrótami',
      description:
        'Na iPhonie Skróty przekazują powiadomienia o transakcjach do BankStats. To Ty tworzysz i zatwierdzasz automatyzację.',
      warning:
        'Włącz powiadomienia banku i Portfela Apple. Wyłączone powiadomienia uniemożliwiają automatyczny zapis transakcji, a tryb Nie przeszkadzać lub inny tryb skupienia może go zakłócić.',
      manualNote: 'Transakcje nadal możesz dodać ręcznie.',
    },
    banks: {
      eyebrow: 'KONFIGURACJA SKRÓTÓW',
      title: 'Wybierz banki do konfiguracji',
      description:
        'Zaznacz banki, a potem dodaj gotowy skrót. Automatyczne przechwytywanie działa na razie dla Millennium, PKO BP, ING i mBanku.',
      soonSuffix: ', wkrótce',
      soon: 'Wkrótce',
      stepsTitle: 'Jak uruchomić przechwytywanie',
      stepOne: '1. Otwórz udostępniony skrót i dodaj go do aplikacji Skróty.',
      stepTwo: '2. Po dodaniu wróć do BankStats i wybierz „Skrót dodany — dalej”. Pokażemy, jak włączyć automatyzację.',
      note: 'Jeśli zobaczysz ekran powitania w Skrótach, przejdź go, wróć tutaj i wybierz „Dodaj skrót ponownie”.',
    },
    automation: {
      eyebrow: 'OSTATNI KROK W SKRÓTACH',
      title: 'Włącz automatyzację',
      description:
        'iOS dodaje automatyzację ze skrótu jako wyłączoną. Dopóki jej nie włączysz, BankStats nie dostanie powiadomień z banku.',
      stepOne: '1. W aplikacji Skróty otwórz Bibliotekę i stuknij Automatyzacja.',
      stepTwo: '2. Włącz przełącznik przy automatyzacji BankStats.',
    },
    focusIntro: {
      eyebrow: 'TRYB NIE PRZESZKADZAĆ',
      title: 'Przepuść powiadomienia banku',
      description:
        'Tryb Nie przeszkadzać może zakłócić przechwytywanie transakcji. Dodaj do wyjątków przede wszystkim Portfel, a także aplikacje banków, aby ich powiadomienia nie były wyciszane. Potem sprawdź zapis na swoim telefonie.',
      note: 'To samo ustaw w innych trybach skupienia, z których korzystasz, na przykład w trybie Sen.',
    },
    releaseNotes: {
      eyebrow: 'NOWOŚĆ DLA BETA TESTERÓW',
      title: 'Hej, beta testerzy!',
      description:
        'W wersji 1.0.9 możesz ustawić ton powiadomień o limitach: pasywny, lekko agresywny albo bardzo agresywny, z wulgaryzmami.',
      stepOne: '1. W zakładce Sklepy stuknij przycisk limitów.',
      stepTwo: '2. Ustaw limit, zostaw włączone Powiadomienia i wybierz ton, na przykład Bardzo agresywny.',
    },
    sessionAnnouncement: {
      eyebrow: 'NOWOŚĆ DLA BETA TESTERÓW',
      title: 'Koniec z wylogowywaniem',
      description:
        'Aplikacja nie będzie już sama Cię wylogowywać. Żeby ta zmiana zadziałała, wyloguj się i zaloguj ponownie. Wystarczy zrobić to raz, potem zostaniesz zalogowany, dopóki sam się nie wylogujesz.',
      note: 'Transakcje i ustawienia zostają na telefonie. Po zalogowaniu wszystko będzie na swoim miejscu.',
      signOut: 'Wyloguj się teraz',
      later: 'Później',
      signOutFailed: 'Nie udało się wylogować. Spróbuj ponownie.',
    },
    focusSetup: {
      eyebrow: 'USTAWIENIA IPHONE’A',
      title: 'Dodaj banki do wyjątków',
      description: 'Po dodaniu wyjątków sprawdź, czy transakcje zapisują się także przy włączonym trybie Nie przeszkadzać.',
      stepOne: '1. Otwórz Ustawienia, stuknij Skupienie, a potem Nie przeszkadzać.',
      stepTwo: '2. W sekcji Włącz powiadomienia stuknij Aplikacje.',
      stepThree: '3. Wybierz Pozwalaj na powiadomienia, stuknij Dodaj i zaznacz Portfel oraz aplikacje swoich banków.',
      walletTitle: 'Najważniejszy jest Portfel',
      walletDescription:
        'Płatności kartą zapisujemy z powiadomień Portfela, bo tylko one mają nazwę sklepu. Bez Portfela na liście wyjątków te transakcje nie zapiszą się przy włączonym trybie Nie przeszkadzać.',
      verification:
        'Po prawdziwej transakcji sprawdź zapis w profilu, w sekcji Przechwytywanie. Jeśli jej brakuje, wyłącz tryb skupienia i sprawdź kolejne powiadomienie. Pominięte transakcje dodaj ręcznie.',
    },
    pin: {
      eyebrow: 'ZABEZPIECZENIE',
      title: 'Chroń swoje finanse',
      pinOnly: 'Ustaw 4-cyfrowy kod PIN. Będziemy o niego pytać przy otwieraniu aplikacji.',
      withBiometric: (biometric: string) =>
        `Aplikację odblokujesz przez ${biometric}. Gdy nie rozpozna Cię, wpiszesz 4-cyfrowy kod PIN.`,
    },
    completion: {
      title: 'Witaj w BankStats',
      description:
        'Twoje finanse w jednym miejscu. Dodaj pierwszą transakcję i zacznij poznawać swoje wydatki.',
      noteTitle: 'Transakcje ze Skrótów',
      noteText:
        'Będą dodawane automatycznie po zapisaniu i włączeniu automatyzacji w aplikacji Skróty. Możesz też dodawać je ręcznie.',
    },
  },
  en: {
    chooseBank: 'Choose Millennium, PKO BP, ING or mBank, or set up capture later.',
    shortcutUnavailable: 'The shortcut for this set of banks is coming soon. Change your selection or set up capture later.',
    shortcutsIphoneOnly: 'Shortcuts setup is available on iPhone.',
    progressSaveFailed: 'Could not save the setup progress. Please try again.',
    shortcutOpenFailed: 'Could not open the shortcut. Please try again.',
    finishFailed: 'Could not save the setup. Please try again.',
    continueFree: 'Continue for free',
    goToPayment: 'Go to payment',
    goToSetup: 'Go to setup',
    addShortcut: 'Add the shortcut',
    addShortcutAgain: 'Add the shortcut again',
    shortcutAdded: 'Shortcut added — continue',
    openingShortcut: 'Opening Shortcuts…',
    automationEnabled: "I've turned it on",
    showFocusSetup: 'Show me how',
    focusConfigured: "I've allowed them",
    openShortcuts: 'Open Shortcuts',
    goToApp: 'Go to the app',
    next: 'Next',
    premiumSoon: 'Premium payments are coming soon. Choose the free plan to continue.',
    back: 'Go back to the previous screen',
    done: 'Done',
    skipIntro: 'Skip intro',
    progress: (step: number, count: number) => `Setup progress: ${step} of ${count}`,
    saving: 'Saving…',
    notNow: 'Not now',
    setUpLater: "I'll set it up later",
    welcome: {
      eyebrow: 'WELCOME TO BANKSTATS',
      title: 'See where your money goes',
      description:
        'BankStats turns spending and income from notifications into clear statistics. No bank login or password needed.',
      spendingTitle: 'Spending in one place',
      spendingDescription: 'Browse shops, transactions and changes over time.',
      controlTitle: "You're in control",
      controlDescription: 'You choose which notifications can reach the app.',
    },
    limits: {
      caption: 'YOUR LIMIT',
      merchant: 'Chosen shop',
      amount: '400 zł',
      example: 'Example: 320 zł spent of 400 zł',
      alertPreview: 'You’re getting close to your limit',
      eyebrow: 'LIMITS AND ALERTS',
      title: 'Set an amount for a shop',
      description:
        "Choose a shop and the amount you want to keep an eye on. We'll let you know when you get close to the limit or reach it.",
      earlyTitle: 'Know early',
      earlyDescription: 'You can get a warning as early as 80% of the limit.',
      periodTitle: 'Choose the period',
      periodDescription: 'A limit can cover a week, a month or a year.',
      note: "Alerts appear after transactions update in the app. They don't block payments.",
    },
    plans: {
      eyebrow: 'YOU CHOOSE HOW TO USE IT',
      title: 'Choose your plan',
      description:
        'Use it for free or see what Premium will offer. Premium payments are coming soon.',
      freeLabel: 'Free plan, 0 zł, eventually one active limit and one month of spending',
      freeName: 'Free',
      freePrice: '0 zł',
      freeDetail: 'Eventually: 1 active limit · charts and spending up to 1 month',
      premiumLabel:
        'Premium plan, 9.99 zł a month or 99.99 zł a year instead of 119.88 zł, coming soon',
      comingSoon: 'SOON',
      monthlyPrice: '9.99 zł / month',
      or: 'or',
      oldYearlyPrice: '119.88 zł',
      yearlyPrice: '99.99 zł / year',
      unlimitedLimits: 'Unlimited active limits',
      moreStatistics: 'More statistics and longer time ranges',
      note: "Premium can't be bought yet. You can start using the free version right away.",
    },
    shortcuts: {
      eyebrow: 'HOW CAPTURE WORKS',
      title: 'Connect BankStats with Shortcuts',
      description:
        'On iPhone, Shortcuts passes transaction notifications to BankStats. You create and approve the automation yourself.',
      warning:
        'Turn on notifications for your bank and Apple Wallet. Disabled notifications prevent automatic capture, and Do Not Disturb or another Focus may interfere with it.',
      manualNote: 'You can still add transactions manually.',
    },
    banks: {
      eyebrow: 'SHORTCUTS SETUP',
      title: 'Choose the banks to set up',
      description:
        'Select your banks, then add the ready-made shortcut. For now, automatic capture works for Millennium, PKO BP, ING and mBank.',
      soonSuffix: ', coming soon',
      soon: 'Soon',
      stepsTitle: 'How to start capturing',
      stepOne: '1. Open the shared shortcut and add it to the Shortcuts app.',
      stepTwo: "2. After adding it, return to BankStats and choose “Shortcut added — continue”. We'll show you how to turn on the automation.",
      note: 'If Shortcuts shows a welcome screen, complete it, return here and choose “Add the shortcut again”.',
    },
    automation: {
      eyebrow: 'LAST STEP IN SHORTCUTS',
      title: 'Turn on the automation',
      description:
        "iOS adds the shortcut's automation turned off. Until you turn it on, BankStats won't receive your bank notifications.",
      stepOne: '1. In the Shortcuts app, open Library and tap Automation.',
      stepTwo: '2. Turn on the switch next to the BankStats automation.',
    },
    focusIntro: {
      eyebrow: 'DO NOT DISTURB',
      title: 'Let your bank notifications through',
      description:
        'Do Not Disturb may interfere with transaction capture. Allow Wallet above all, along with your bank apps, so their notifications are not silenced. Then check saving on your phone.',
      note: 'Do the same in any other Focus you use, such as Sleep.',
    },
    releaseNotes: {
      eyebrow: 'NEW FOR BETA TESTERS',
      title: 'Hey, beta testers!',
      description:
        'In version 1.0.9 you can choose the tone of limit alerts: Calm, Snarky or Brutal, which swears.',
      stepOne: '1. On the Shops tab, tap the limits button.',
      stepTwo: '2. Set a limit, keep Notifications on and choose a tone, such as Brutal.',
    },
    sessionAnnouncement: {
      eyebrow: 'NEW FOR BETA TESTERS',
      title: 'No more surprise sign-outs',
      description:
        "The app won't sign you out on its own anymore. To switch this on, sign out and sign in again. You only need to do it once, then you stay signed in until you sign out yourself.",
      note: 'Your transactions and settings stay on this phone. Everything will be where you left it after you sign in.',
      signOut: 'Sign out now',
      later: 'Later',
      signOutFailed: 'Could not sign out. Please try again.',
    },
    focusSetup: {
      eyebrow: 'IPHONE SETTINGS',
      title: 'Allow your banks',
      description: 'After allowing the apps, check whether transactions also save while Do Not Disturb is on.',
      stepOne: '1. Open Settings, tap Focus, then Do Not Disturb.',
      stepTwo: '2. Under Allow Notifications, tap Apps.',
      stepThree: '3. Choose Allow Notifications From, tap Add and select Wallet and your bank apps.',
      walletTitle: 'Wallet matters most',
      walletDescription:
        "Card payments are saved from Wallet notifications, because only they include the shop name. If Wallet isn't allowed, those transactions won't save while Do Not Disturb is on.",
      verification:
        'After a real transaction, check saving under Capture in your profile. If it is missing, turn off Focus and check the next notification. Add missed transactions manually.',
    },
    pin: {
      eyebrow: 'SECURITY',
      title: 'Protect your finances',
      pinOnly: "Set a 4-digit PIN. We'll ask for it when you open the app.",
      withBiometric: (biometric: string) =>
        `You'll unlock the app with ${biometric}. If it doesn't recognize you, you'll enter a 4-digit PIN.`,
    },
    completion: {
      title: 'Welcome to BankStats',
      description:
        'Your finances in one place. Add your first transaction and start getting to know your spending.',
      noteTitle: 'Transactions from Shortcuts',
      noteText:
        "They'll be added automatically once you save and turn on the automation in the Shortcuts app. You can also add them manually.",
    },
  },
});
