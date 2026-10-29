import { defineCopy } from '@/features/app-shell/localization/language';

import type { AlertTone } from '../rules/alert-rule';
import type { PaymentAlertTier } from './payment-alert-copy';

export type BudgetAlertTier = Exclude<PaymentAlertTier, 'under'>;

export interface BudgetAlertFacts {
  where: string;
  period: string;
  payment: string;
  spent: string;
  target: string;
  remaining: string;
  over: string;
}

type BudgetAlertText = (facts: BudgetAlertFacts) => { title: string; body: string };

export const budgetScopeCopy = defineCopy({
  pl: {
    all: 'na wszystkie wydatki',
    category: (name: string) => `w kategorii ${name}`,
  },
  en: {
    all: 'for all spending',
    category: (name: string) => `for ${name}`,
  },
});

export const budgetAlertCopy = defineCopy<Record<AlertTone, Record<BudgetAlertTier, BudgetAlertText[]>>>({
  pl: {
    passive: {
      half: [
        () => ({
          title: 'Połowa limitu za Tobą',
          body: 'Warto trochę zwolnić.',
        }),
      ],
      most: [
        () => ({
          title: '80% limitu za Tobą',
          body: 'Uważaj na kolejne zakupy.',
        }),
      ],
      last: [
        () => ({
          title: '90% limitu za Tobą',
          body: 'Lepiej już nie wydawać.',
        }),
      ],
      over: [
        () => ({
          title: 'Limit przekroczony',
          body: 'Czas zacisnąć pasa.',
        }),
      ],
    },
    mild: {
      half: [
        () => ({
          title: 'No i połowa limitu poszła',
          body: 'A okres jeszcze trwa.',
        }),
      ],
      most: [
        () => ({
          title: '80% limitu. Uważaj!',
          body: 'Jeszcze chwila i limit pęknie.',
        }),
      ],
      last: [
        ({ remaining }) => ({
          title: `Stop. Zostało ${remaining}`,
          body: 'Teraz tylko to, co musisz.',
        }),
      ],
      over: [
        () => ({
          title: 'Limit przekroczony. Serio?',
          body: 'Czas zacisnąć pasa.',
        }),
      ],
    },
    aggressive: {
      half: [
        () => ({
          title: 'Wydaj, k**wa, wszystko!',
          body: 'Połowa limitu już poszła.',
        }),
        () => ({
          title: 'Połowa limitu w pi**u',
          body: 'Brawo, k**wa, zwolnij.',
        }),
        () => ({
          title: 'Połowa poszła w ch*j',
          body: 'A okres się, k**wa, nie skończył.',
        }),
        () => ({
          title: 'Pół limitu wyje**ne, brawo',
          body: 'Klaszczę, k**wa, na stojąco.',
        }),
        () => ({
          title: 'Szastasz kasą jak po***b',
          body: 'Połowa limitu poszła w pi**u.',
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
        () => ({
          title: '80% w pi**u, gratulacje',
          body: 'Jeszcze trochę i będziesz, k**wa, żebrać.',
        }),
        () => ({
          title: 'Zostaw tę kartę, k**wa!',
          body: '80% limitu już przepie***lone.',
        }),
        () => ({
          title: 'Ty masz, k**wa, jakiś plan?',
          body: 'Bo limit się kończy, geniuszu.',
        }),
        () => ({
          title: 'Ja pie***lę, 80% limitu',
          body: 'Schowaj, k**wa, ten portfel.',
        }),
      ],
      last: [
        () => ({
          title: 'Do reszty cię popie***liło?',
          body: 'Ani złotówki więcej.',
        }),
        () => ({
          title: 'KONIEC. Słyszysz, k**wa?!',
          body: 'Jak już musisz, to ostatni raz.',
        }),
        () => ({
          title: 'Ani grosza więcej, k**wa!',
          body: 'Ostatnia płatność i koniec, k**wa.',
        }),
        () => ({
          title: 'Odłóż to, do ch*ja!',
          body: 'Limit zaraz pęknie w pi**u.',
        }),
        () => ({
          title: 'Zaraz ci kartę, k**wa, utnę',
          body: 'Zostały ochłapy z limitu.',
        }),
        () => ({
          title: 'Jeszcze raz i, k**wa, koniec',
          body: 'Limit wisi na włosku, debilu.',
        }),
        ({ remaining }) => ({
          title: `Zostało ${remaining}, k**wa`,
          body: 'I ani grosza więcej.',
        }),
      ],
      over: [
        () => ({
          title: 'Limit przeje**ny, k**wa!',
          body: 'To w ch*j za dużo.',
        }),
        () => ({
          title: 'Limit poszedł się je**ć >:(',
          body: 'Gratulacje, k**wa.',
        }),
        () => ({
          title: 'No i ch*j, limit pękł',
          body: 'Brawo, k**wa, geniuszu finansów.',
        }),
        () => ({
          title: 'Limit spie***lony na amen',
          body: 'Weź się, k**wa, ogarnij.',
        }),
        () => ({
          title: 'Limit? Jaki, k**wa, limit?',
          body: 'Ten, co go właśnie rozje**no.',
        }),
        () => ({
          title: 'K**wa mać, znowu ponad!',
          body: 'Komornik już ostrzy zęby.',
        }),
        () => ({
          title: 'Pie***lony rekordzista',
          body: 'Limit rozje**ny w drobny mak.',
        }),
      ],
    },
  },
  en: {
    passive: {
      half: [
        () => ({
          title: 'Half your limit used',
          body: 'Maybe slow down.',
        }),
      ],
      most: [
        () => ({
          title: '80% of your limit',
          body: 'Careful with the next one.',
        }),
      ],
      last: [
        () => ({
          title: '90% of your limit',
          body: 'Best stop spending.',
        }),
      ],
      over: [
        () => ({
          title: 'Limit exceeded',
          body: 'Time to tighten your belt.',
        }),
      ],
    },
    mild: {
      half: [
        () => ({
          title: 'Half the limit is gone',
          body: 'And the period is not over.',
        }),
      ],
      most: [
        () => ({
          title: '80% gone. Careful!',
          body: 'The limit is about to break.',
        }),
      ],
      last: [
        ({ remaining }) => ({
          title: `Stop. Only ${remaining} left`,
          body: 'Only what you really need now.',
        }),
      ],
      over: [
        () => ({
          title: 'Limit blown. Seriously?',
          body: 'Time to tighten your belt.',
        }),
      ],
    },
    aggressive: {
      half: [
        () => ({
          title: 'Half of it f***ing gone',
          body: 'Slow down, genius.',
        }),
        () => ({
          title: 'Half gone, you absolute muppet',
          body: 'Slow the f*** down.',
        }),
        () => ({
          title: 'Holy sh*t, half already?',
          body: 'Pace yourself, d*mmit.',
        }),
      ],
      most: [
        () => ({
          title: 'Get your sh*t together!',
          body: '80% already gone.',
        }),
        () => ({
          title: `80% gone, for f***'s sake`,
          body: 'Put the d*mn card away.',
        }),
        () => ({
          title: 'What the f*** is your plan?',
          body: 'The limit is nearly gone.',
        }),
      ],
      last: [
        () => ({
          title: 'STOP spending. Hear me?!',
          body: 'Not one more cent.',
        }),
        () => ({
          title: 'Not one f***ing more!',
          body: 'Seriously, the last one.',
        }),
        () => ({
          title: 'Card down. Right f***ing now',
          body: 'The limit is on life support.',
        }),
      ],
      over: [
        () => ({
          title: 'You f***ing blew it!',
          body: 'Way too f***ing much.',
        }),
        () => ({
          title: 'The limit is f***ing gone >:(',
          body: 'Congrats, genius.',
        }),
        () => ({
          title: 'Limit? What f***ing limit?',
          body: 'The one you just wrecked.',
        }),
        () => ({
          title: 'Well, sh*t. Over again.',
          body: 'Congrats, financial genius.',
        }),
      ],
    },
  },
});

export const foodBudgetAlertCopy = defineCopy<Record<AlertTone, Record<BudgetAlertTier, BudgetAlertText[]>>>({
  pl: {
    passive: {
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
      half: [
        () => ({
          title: 'Połowa limitu przejedzona',
          body: 'Spodnie już trochę cisną?',
        }),
      ],
      most: [
        () => ({
          title: '80% limitu zjedzone',
          body: 'Może sałatka zamiast kolejnej przekąski?',
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
      half: [
        () => ({
          title: 'Połowa przeżarta, grubasie',
          body: 'Brzuch rośnie szybciej niż oszczędności.',
        }),
        () => ({
          title: 'No tak, wpie***laj dalej',
          body: 'Połowa limitu poszła na żarcie.',
        }),
        () => ({
          title: 'Pół limitu w żołądku, k**wa',
          body: 'Zwolnij z tym żarciem.',
        }),
        () => ({
          title: 'Przestań, k**wa, żreć!',
          body: 'Połowa limitu przepie***lona na jedzenie.',
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
        () => ({
          title: 'Żresz jak pie***lony smok',
          body: '80% limitu na żarcie poszło.',
        }),
        () => ({
          title: 'Odłóż ten kebab, k**wa!',
          body: 'Limit na jedzenie ledwo dycha.',
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
        () => ({
          title: 'Lodówka zamknięta, k**wa!',
          body: 'Od jutra, k**wa, ryż i woda.',
        }),
        () => ({
          title: 'Jeszcze jeden kęs i ch*j',
          body: 'Limit na jedzenie się kończy.',
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
          title: 'Limit przeżarty w ch*j',
          body: 'Gratulacje, k**wa, smacznego.',
        }),
        () => ({
          title: 'Zeżarte, k**wa, wszystko!',
          body: 'Nawet okruszka nie zostało.',
        }),
        () => ({
          title: 'Smacznego, do ch*ja!',
          body: 'Limit na jedzenie rozje**ny.',
        }),
      ],
    },
  },
  en: {
    passive: {
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
      half: [
        () => ({
          title: 'Half of it eaten, fatso',
          body: 'Your belly grows faster than your savings.',
        }),
        () => ({
          title: 'Half the food limit, sh*t',
          body: 'Slow the f*** down.',
        }),
      ],
      most: [
        () => ({
          title: 'Belt still closing?',
          body: 'Put the f***ing chips down.',
        }),
        () => ({
          title: 'Drop the d*mn kebab!',
          body: '80% eaten already.',
        }),
      ],
      last: [
        () => ({
          title: 'STOP, fatso!',
          body: 'Then water and carrots.',
        }),
        () => ({
          title: 'Fridge closed. F***ing closed.',
          body: 'Rice and water from now on.',
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
        () => ({
          title: 'Limit eaten, holy sh*t',
          body: 'Bon appétit, genius.',
        }),
      ],
    },
  },
});
