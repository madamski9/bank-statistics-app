import { defineCopy } from '@/features/app-shell/localization/language';

import type { AlertTone } from '../rules/alert-rule';

export type PaymentAlertTier = 'under' | 'half' | 'most' | 'last' | 'over';

export interface PaymentAlertFacts {
  shop: string;
  period: string;
  payment: string;
  spent: string;
  target: string;
  remaining: string;
  over: string;
}

type PaymentAlertText = (facts: PaymentAlertFacts) => { title: string; body: string };

export const alertStandingCopy = defineCopy({
  pl: {
    remaining: (shop: string, remaining: string) => `${shop}: do limitu zostało ${remaining}.`,
    over: (shop: string, over: string) => `${shop}: ${over} ponad limit.`,
    budgetRemaining: (shop: string, where: string, remaining: string) =>
      `${shop}: do limitu ${where} zostało ${remaining}.`,
    budgetOver: (shop: string, where: string, over: string) => `${shop}: ${over} ponad limit ${where}.`,
  },
  en: {
    remaining: (shop: string, remaining: string) => `${shop}: ${remaining} left until your limit.`,
    over: (shop: string, over: string) => `${shop}: ${over} over your limit.`,
    budgetRemaining: (shop: string, where: string, remaining: string) =>
      `${shop}: ${remaining} left of your limit ${where}.`,
    budgetOver: (shop: string, where: string, over: string) => `${shop}: ${over} over your limit ${where}.`,
  },
});

export const paymentAlertCopy = defineCopy<Record<AlertTone, Record<PaymentAlertTier, PaymentAlertText[]>>>({
  pl: {
    passive: {
      under: [
        ({ shop, payment }) => ({
          title: `${payment} w ${shop}`,
          body: '',
        }),
      ],
      half: [
        ({ shop }) => ({
          title: `Połowa limitu w ${shop}`,
          body: 'Warto trochę zwolnić.',
        }),
      ],
      most: [
        ({ shop }) => ({
          title: `80% limitu w ${shop}`,
          body: 'Uważaj na kolejne zakupy.',
        }),
      ],
      last: [
        ({ shop }) => ({
          title: `90% limitu w ${shop}`,
          body: 'Najlepiej, żeby to był ostatni raz.',
        }),
      ],
      over: [
        ({ shop }) => ({
          title: `Limit w ${shop} przekroczony`,
          body: 'Warto odpuścić ten sklep do końca okresu.',
        }),
      ],
    },
    mild: {
      under: [
        ({ shop }) => ({
          title: `Znowu ${shop}?`,
          body: 'Pamiętasz, że masz tu limit?',
        }),
      ],
      half: [
        () => ({
          title: 'Połowa limitu poszła',
          body: 'Na pewno wiesz, co robisz?',
        }),
      ],
      most: [
        () => ({
          title: '80% limitu. Uważaj!',
          body: 'Jeszcze chwila i limit pęknie.',
        }),
      ],
      last: [
        () => ({
          title: 'Stop. To prawie koniec',
          body: 'Jeśli musisz, to naprawdę ostatni raz.',
        }),
      ],
      over: [
        () => ({
          title: 'Limit przekroczony. Serio?',
          body: 'Odpuść ten sklep, serio.',
        }),
      ],
    },
    aggressive: {
      under: [
        () => ({
          title: 'Czy ciebie popie***liło?!',
          body: 'Tyle wydajesz w tym sklepie??',
        }),
        ({ shop, payment }) => ({
          title: `K**wa, znowu ${shop}?!`,
          body: `Kolejne ${payment} wyje**ne, przestań tam łazić.`,
        }),
        ({ payment }) => ({
          title: 'Ja pie***lę, znowu?! >:(',
          body: `Kolejne ${payment} w błoto w tym zaje**nym sklepie.`,
        }),
      ],
      half: [
        () => ({
          title: 'Wydaj, k**wa, wszystko!',
          body: 'Połowa limitu już poszła, brawo.',
        }),
        () => ({
          title: 'Połowa limitu w pi**u',
          body: 'Brawo, k**wa, zwolnij.',
        }),
      ],
      most: [
        () => ({
          title: 'Po ch*j tyle wydajesz?!',
          body: 'No żesz k**wa mać.',
        }),
        () => ({
          title: 'Ogarnij się, k**wa!',
          body: '80% limitu już poszło.',
        }),
      ],
      last: [
        () => ({
          title: 'KONIEC. Słyszysz, k**wa?!',
          body: 'Ostatni pie***lony raz.',
        }),
        () => ({
          title: 'Do reszty cię popie***liło?',
          body: 'To ma być ostatnia płatność.',
        }),
      ],
      over: [
        () => ({
          title: 'Limit przeje**ny, k**wa!',
          body: 'To w ch*j za dużo.',
        }),
        () => ({
          title: 'Po ch*j dalej tam łazisz?!',
          body: 'No żesz k**wa mać.',
        }),
        () => ({
          title: 'Wydaj, k**wa, wszystko!',
          body: 'Gratulacje, k**wa.',
        }),
      ],
    },
  },
  en: {
    passive: {
      under: [
        ({ shop, payment }) => ({
          title: `${payment} at ${shop}`,
          body: '',
        }),
      ],
      half: [
        ({ shop }) => ({
          title: `Half your ${shop} limit`,
          body: 'Maybe slow down.',
        }),
      ],
      most: [
        ({ shop }) => ({
          title: `80% of your ${shop} limit`,
          body: 'Careful with the next one.',
        }),
      ],
      last: [
        ({ shop }) => ({
          title: `90% of your ${shop} limit`,
          body: 'Best make it the last time.',
        }),
      ],
      over: [
        ({ shop }) => ({
          title: `${shop} limit exceeded`,
          body: 'Maybe skip this shop for now.',
        }),
      ],
    },
    mild: {
      under: [
        ({ shop }) => ({
          title: `${shop} again?`,
          body: 'Remember you have a limit here?',
        }),
      ],
      half: [
        () => ({
          title: 'Half the limit is gone',
          body: 'Sure you know what you are doing?',
        }),
      ],
      most: [
        () => ({
          title: '80% gone. Careful!',
          body: 'The limit is about to break.',
        }),
      ],
      last: [
        () => ({
          title: 'Stop. Almost at the limit',
          body: 'If you must, make it the last time.',
        }),
      ],
      over: [
        () => ({
          title: 'Limit blown. Seriously?',
          body: 'Skip it, seriously.',
        }),
      ],
    },
    aggressive: {
      under: [
        ({ payment }) => ({
          title: 'Are you f***ing kidding me?',
          body: `Another ${payment} gone.`,
        }),
        ({ payment }) => ({
          title: `Oh for f***'s sake >:(`,
          body: `Another ${payment} down the drain.`,
        }),
      ],
      half: [
        () => ({
          title: 'Half of it f***ing gone',
          body: 'Slow down, genius.',
        }),
      ],
      most: [
        () => ({
          title: 'Get your sh*t together!',
          body: '80% already gone.',
        }),
      ],
      last: [
        () => ({
          title: 'DONE. Hear me?!',
          body: 'Last f***ing time.',
        }),
      ],
      over: [
        () => ({
          title: 'You f***ing blew it!',
          body: 'Way too f***ing much.',
        }),
        () => ({
          title: 'Why the f*** go back there?!',
          body: 'Congrats, genius.',
        }),
      ],
    },
  },
});

export const foodPaymentAlertCopy = defineCopy<Record<AlertTone, Record<PaymentAlertTier, PaymentAlertText[]>>>({
  pl: {
    passive: {
      under: [
        ({ shop, payment }) => ({
          title: `${payment} w ${shop}`,
          body: '',
        }),
      ],
      half: [
        () => ({
          title: 'Połowa limitu na jedzenie',
          body: 'Może dziś coś z lodówki?',
        }),
      ],
      most: [
        () => ({
          title: '80% limitu na jedzenie',
          body: 'Warto zaplanować posiłki.',
        }),
      ],
      last: [
        () => ({
          title: '90% limitu na jedzenie',
          body: 'Czas gotować w domu.',
        }),
      ],
      over: [
        () => ({
          title: 'Limit na jedzenie przekroczony',
          body: 'Czas gotować w domu.',
        }),
      ],
    },
    mild: {
      under: [
        () => ({
          title: 'Znowu głód?',
          body: 'Lodówka w domu też działa.',
        }),
        ({ shop }) => ({
          title: `${shop}, znowu?`,
          body: 'Jeszcze trochę i kasjer zacznie mówić po imieniu.',
        }),
      ],
      half: [
        () => ({
          title: 'Połowa limitu przejedzona',
          body: 'Spodnie trochę cisną?',
        }),
      ],
      most: [
        () => ({
          title: '80% limitu zjedzone',
          body: 'Może sałatka zamiast przekąski?',
        }),
      ],
      last: [
        () => ({
          title: 'Lodówka zamknięta. Serio.',
          body: 'Potem dieta.',
        }),
      ],
      over: [
        () => ({
          title: 'Limit przejedzony',
          body: 'I pewnie parę kilo też.',
        }),
      ],
    },
    aggressive: {
      under: [
        () => ({
          title: 'Znowu żresz, grubasie?!',
          body: 'Rusz dupę na siłownię.',
        }),
        ({ payment }) => ({
          title: 'Ty tłusta parówo, znowu?',
          body: `Kolejne ${payment} w boczki.`,
        }),
        ({ payment }) => ({
          title: 'K**wa, ile można żreć?!',
          body: `Znowu ${payment} na żarcie.`,
        }),
      ],
      half: [
        () => ({
          title: 'Połowa przeżarta, grubasie',
          body: 'Brzuch rośnie szybciej niż oszczędności.',
        }),
        () => ({
          title: 'No tak, wpie***laj dalej',
          body: 'Połowa limitu poszła na żarcie.',
        }),
      ],
      most: [
        () => ({
          title: 'Pasa już nie dopinasz?',
          body: 'Odłóż te chipsy, k**wa.',
        }),
        () => ({
          title: 'Ile ty żresz, k**wa?!',
          body: 'No żesz k**wa mać.',
        }),
      ],
      last: [
        () => ({
          title: 'STOP, tłusta parówo!',
          body: 'Potem woda i marchewka.',
        }),
        () => ({
          title: 'Popie***liło cię z żarciem?',
          body: 'To ma być ostatnie żarcie.',
        }),
      ],
      over: [
        () => ({
          title: 'Przeżarte, k**wa!',
          body: 'Odłóż widelec, grubasie.',
        }),
        () => ({
          title: 'Wszystko przeżarte, grubasie!',
          body: 'Jeszcze trochę i drzwi będą za wąskie.',
        }),
        () => ({
          title: 'Po prostu je**ny grubas.',
          body: 'Brak słów.',
        }),
        () => ({
          title: 'Po ch*j dalej żresz?!',
          body: 'No żesz k**wa mać.',
        }),
      ],
    },
  },
  en: {
    passive: {
      under: [
        ({ shop, payment }) => ({
          title: `${payment} at ${shop}`,
          body: '',
        }),
      ],
      half: [
        () => ({
          title: 'Half your food limit',
          body: 'Fridge tonight?',
        }),
      ],
      most: [
        () => ({
          title: '80% of your food limit',
          body: 'Plan your meals.',
        }),
      ],
      last: [
        () => ({
          title: '90% of your food limit',
          body: 'Time to cook at home.',
        }),
      ],
      over: [
        () => ({
          title: 'Food limit exceeded',
          body: 'Time to cook at home.',
        }),
      ],
    },
    mild: {
      under: [
        () => ({
          title: 'Hungry again?',
          body: 'The fridge works too.',
        }),
      ],
      half: [
        () => ({
          title: 'Half the limit eaten',
          body: 'Jeans getting a bit tight?',
        }),
      ],
      most: [
        () => ({
          title: '80% eaten',
          body: 'Maybe a salad instead?',
        }),
      ],
      last: [
        () => ({
          title: 'The fridge is closed.',
          body: 'Then the diet starts.',
        }),
      ],
      over: [
        () => ({
          title: 'Limit eaten through',
          body: 'And a few kilos too.',
        }),
      ],
    },
    aggressive: {
      under: [
        () => ({
          title: 'Stuffing your face, fatso?!',
          body: 'Get your a** to the gym.',
        }),
        () => ({
          title: 'How much can you f***ing eat?',
          body: 'Again?!',
        }),
      ],
      half: [
        () => ({
          title: 'Half of it eaten, fatso',
          body: 'Your belly grows faster than your savings.',
        }),
      ],
      most: [
        () => ({
          title: 'Belt still closing?',
          body: 'Put the f***ing chips down.',
        }),
      ],
      last: [
        () => ({
          title: 'STOP, fatso!',
          body: 'Then water and carrots.',
        }),
      ],
      over: [
        () => ({
          title: 'Food limit f***ing devoured!',
          body: 'Put the fork down.',
        }),
        () => ({
          title: 'Everything eaten, fatso!',
          body: 'Soon you will not fit through the door.',
        }),
      ],
    },
  },
});
