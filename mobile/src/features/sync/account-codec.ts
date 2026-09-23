import type { api } from '@bankstats/convex/convex/_generated/api';
import type { FunctionArgs, FunctionReturnType } from 'convex/server';

import type { FinancialAccount } from '@/features/financial-accounts/financial-account';

import type { SyncCodec } from './sync-plan';

export type PushedAccount = FunctionArgs<typeof api.financialAccounts.push>['changes'][number];

export type AccountChange = Omit<PushedAccount, 'revision' | 'deleted'>;

export type RemoteAccount = FunctionReturnType<typeof api.financialAccounts.list>[number];

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
    bank: change.bank === 'millennium' ? 'millennium' : 'manual',
    name: change.name,
    isGeneral: change.isGeneral,
  }),
};
