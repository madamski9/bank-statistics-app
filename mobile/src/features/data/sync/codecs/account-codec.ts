import { financialAccountChangeProblem } from '@bankstats/convex/convex/changeRules';
import type { FinancialAccountContent } from '@bankstats/convex/convex/sync';

import {
  financialAccountBank,
  type FinancialAccount,
} from '@/features/data/financial-accounts/financial-account';

import type { SyncCodec, SyncedChange } from '../engine/sync-plan';

export type AccountChange = FinancialAccountContent;

export type RemoteAccount = SyncedChange<AccountChange>;

export const accountCodec: SyncCodec<FinancialAccount, AccountChange> = {
  includes: () => true,
  idOf: (account) => account.id,
  toChange: (account) => ({
    clientId: account.id,
    bank: account.bank,
    name: account.name,
    isGeneral: account.isGeneral,
  }),
  fromChange: (change) => ({
    id: change.clientId,
    bank: financialAccountBank(change.bank),
    name: change.name,
    isGeneral: change.isGeneral,
  }),
  isPushable: (change) => financialAccountChangeProblem(change) === null,
};
