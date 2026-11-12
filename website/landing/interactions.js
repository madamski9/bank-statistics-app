import { notificationCopy } from './notification-copy.js';

const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const previewImage = document.querySelector('.phone-screenshot');
const previewCaption = document.querySelector('.preview-caption');
const phone = document.querySelector('#interactive-phone');
const hotspots = document.querySelector('#phone-hotspots');
const phoneHint = document.querySelector('#phone-hint');
const previews = {
  overview: { title: 'Przegląd', alt: 'Ekran Przegląd aplikacji BankStats: wydatki, przychody i przepływ pieniędzy w tym miesiącu' },
  transactions: { title: 'Transakcje', alt: 'Historia transakcji w BankStats, uporządkowana według dat' },
  'monthly-report': { title: 'Raport miesięczny', alt: 'Raport miesięczny w BankStats: wydatki według kategorii i sklepów' },
  shops: { title: 'Sklepy i kategorie', alt: 'Sklepy i kategorie w BankStats: miejsca, w których wydajesz najwięcej' },
  spending: { title: 'Szczegóły wydatków', alt: 'Szczegóły wydatków w BankStats: wykres i lista sklepów' },
  'shop-details': { title: 'Żabka', alt: 'Szczegóły sklepu Żabka w BankStats: miesięczny limit i historia zakupów' }
};
const mainScreens = ['overview', 'transactions', 'shops'];
let previewRequest = 0;
let previewAnimation;
let currentScreen = 'overview';
const screenHistory = [];

function addHotspot(key, label, className, action, pressed) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `phone-hotspot ${className}`;
  button.dataset.phoneAction = key;
  button.setAttribute('aria-label', label);
  button.title = label;
  if (pressed !== undefined) button.setAttribute('aria-pressed', String(pressed));
  button.addEventListener('click', action);
  hotspots.append(button);
}

function updatePhoneControls(focusAction) {
  hotspots.replaceChildren();
  phone.dataset.screen = currentScreen;
  if (mainScreens.includes(currentScreen)) {
    for (const key of mainScreens) {
      addHotspot(key, `Pokaż ${previews[key].title.toLocaleLowerCase('pl-PL')}`, `phone-tab phone-tab-${key}`, () => showPreview(key), key === currentScreen);
    }
    if (currentScreen === 'overview') {
      addHotspot('spending', 'Otwórz szczegóły wydatków', 'phone-spending', () => showPreview('spending'));
      addHotspot('monthly-report', 'Otwórz raport miesięczny', 'phone-report', () => showPreview('monthly-report'));
      phoneHint.textContent = 'Kliknij zakładkę, bańkę wydatków lub kafelek raportu.';
    } else if (currentScreen === 'shops') {
      addHotspot('shop-details', 'Otwórz sklep Żabka', 'phone-shop-row', () => showPreview('shop-details'));
      phoneHint.textContent = 'Wybierz sklep Żabka, żeby zobaczyć limit i historię.';
    } else {
      phoneHint.textContent = 'Przełączaj zakładki bezpośrednio na ekranie telefonu.';
    }
  } else {
    addHotspot('back', 'Zamknij szczegóły i wróć', 'phone-close', goBack);
    if (currentScreen === 'spending') {
      addHotspot('shop-details', 'Otwórz sklep Żabka', 'phone-spending-shop', () => showPreview('shop-details'));
    }
    phoneHint.textContent = 'Kliknij zamknięcie w prawym górnym rogu, żeby wrócić.';
  }
  document.querySelectorAll('[data-preview]').forEach(option => option.setAttribute('aria-pressed', String(option.dataset.preview === currentScreen)));
  if (focusAction) {
    const target = Array.from(hotspots.children).find(button => button.dataset.phoneAction === focusAction) ?? hotspots.querySelector('button');
    target?.focus({ preventScroll: true });
  }
}

async function showPreview(key, { back = false } = {}) {
  const request = ++previewRequest;
  if (key === currentScreen) {
    phone.removeAttribute('aria-busy');
    return;
  }
  const image = new Image();
  image.src = `screenshots/${key}.png`;
  phone.setAttribute('aria-busy', 'true');
  try {
    await image.decode();
  } catch {
    if (request === previewRequest) {
      phone.removeAttribute('aria-busy');
      phoneHint.textContent = 'Nie udało się wczytać ekranu. Spróbuj ponownie.';
    }
    return;
  }
  if (request !== previewRequest) return;
  const focusedHotspot = hotspots.contains(document.activeElement) ? document.activeElement.dataset.phoneAction : undefined;
  if (back) screenHistory.pop();
  else if (mainScreens.includes(key)) screenHistory.length = 0;
  else screenHistory.push(currentScreen);
  previewAnimation?.cancel();
  currentScreen = key;
  previewImage.src = image.src;
  previewImage.alt = previews[key].alt;
  previewCaption.textContent = `${previews[key].title} · Rzeczywisty ekran aplikacji`;
  phone.removeAttribute('aria-busy');
  updatePhoneControls(focusedHotspot);
  if (!motionPreference.matches) {
    previewAnimation = previewImage.animate([{ opacity: .25 }, { opacity: 1 }], { duration: 250, easing: 'ease-out' });
  }
}

function goBack() {
  showPreview(screenHistory.at(-1) ?? 'overview', { back: true });
}

for (const button of document.querySelectorAll('[data-preview]')) {
  button.addEventListener('click', () => showPreview(button.dataset.preview));
}
phone.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mainScreens.includes(currentScreen)) {
    event.preventDefault();
    goBack();
  }
});
hotspots.hidden = false;
phoneHint.hidden = false;
updatePhoneControls();

const usage = document.querySelector('#limit-usage');
const notificationTitle = document.querySelector('#notification-title');
const notificationBody = document.querySelector('#notification-body');
const nextNotification = document.querySelector('#next-notification');
const thresholds = [50, 80, 90, 100];
const tiers = ['half', 'most', 'last', 'over'];
const scopeNames = { all: 'Wszystkie wydatki', food: 'Jedzenie', shop: 'Sklep: Rossmann' };
const amountFormatter = new Intl.NumberFormat('pl-PL');
const moneyFormatter = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' });
let selectedTone = 'passive';
let selectedScope = 'all';
let variantIndex = 0;

function updateNotification() {
  const thresholdIndex = Number(usage.value);
  const percent = thresholds[thresholdIndex];
  const messages = notificationCopy[selectedScope][selectedTone][tiers[thresholdIndex]];
  const message = messages[variantIndex % messages.length];
  const facts = {
    shop: 'Rossmann',
    remaining: moneyFormatter.format(1000 - percent * 10)
  };
  const formatMessage = text => text.replace(/\{(\w+)\}/g, (match, key) => facts[key] ?? match);
  document.querySelector('#demo-spent').textContent = amountFormatter.format(percent * 10);
  document.querySelector('#limit-percent').value = `${percent}%`;
  document.querySelector('#demo-scope-label').textContent = scopeNames[selectedScope].toLocaleUpperCase('pl-PL');
  usage.setAttribute('aria-valuetext', `${percent}% limitu, wydano ${percent * 10} z 1000 złotych`);
  notificationTitle.textContent = formatMessage(message.title);
  notificationBody.textContent = formatMessage(message.body);
  document.querySelector('#variant-count').textContent = `Tekst ${variantIndex % messages.length + 1} z ${messages.length}`;
  nextNotification.disabled = messages.length < 2;
}

for (const button of document.querySelectorAll('[data-tone]')) {
  button.addEventListener('click', () => {
    selectedTone = button.dataset.tone;
    variantIndex = 0;
    document.querySelectorAll('[data-tone]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
    updateNotification();
  });
}

for (const button of document.querySelectorAll('[data-limit-scope]')) {
  button.addEventListener('click', () => {
    selectedScope = button.dataset.limitScope;
    variantIndex = 0;
    document.querySelectorAll('[data-limit-scope]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
    updateNotification();
  });
}

nextNotification.addEventListener('click', () => {
  variantIndex += 1;
  updateNotification();
});
usage.addEventListener('input', () => {
  variantIndex = 0;
  updateNotification();
});
updateNotification();
motionPreference.addEventListener('change', () => {
  if (motionPreference.matches) previewAnimation?.cancel();
});

const phoneStage = document.querySelector('.phone-stage');
if (phoneStage) {
  import('./phone-scene.js').then(({ createPhoneScene }) => createPhoneScene(phoneStage)).catch(() => {});
}
