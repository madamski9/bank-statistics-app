import { defineCopy } from '@/features/app-shell/localization/language';

export const financialAccountsCopy = defineCopy({
  pl: {
    cashAndOther: 'Gotówka i inne',
    enterName: 'Podaj nazwę konta.',
    nameTooLong: (maximum: number) => `Nazwa konta może mieć najwyżej ${maximum} znaków.`,
    duplicateName: 'Masz już konto o tej nazwie.',
    addFailed: 'Nie udało się dodać konta. Spróbuj ponownie.',
    account: 'Konto',
    newAccount: '+ Nowe konto',
    newAccountName: 'Nazwa nowego konta',
    namePlaceholder: 'Na przykład Oszczędnościowe',
    add: 'Dodaj',
  },
  en: {
    cashAndOther: 'Cash and other',
    enterName: 'Enter an account name.',
    nameTooLong: (maximum: number) => `An account name can have at most ${maximum} characters.`,
    duplicateName: 'You already have an account with this name.',
    addFailed: 'Could not add the account. Please try again.',
    account: 'Account',
    newAccount: '+ New account',
    newAccountName: 'New account name',
    namePlaceholder: 'For example Savings',
    add: 'Add',
  },
});
