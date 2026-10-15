import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import { internalAction, internalMutation, mutation, type MutationCtx } from './_generated/server';
import { requireTrustedSession } from './devices';
import { premiumAlreadyPermanentError, premiumCodeInvalidError } from './premiumCodeErrors';
import { findProfile } from './profiles';

const codeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const codeLength = 10;
const maximumCodesPerRun = 50;
const maximumMonths = 120;

export function normalizePremiumCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function readablePremiumCode(code: string): string {
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

function randomPremiumCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(codeLength));

  return Array.from(bytes, (byte) => codeAlphabet[byte % codeAlphabet.length]).join('');
}

export function premiumEndAfter(start: number, months: number): number {
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + months);

  return end.getTime();
}

export const create = internalAction({
  args: { months: v.optional(v.number()), count: v.optional(v.number()) },
  handler: async (ctx, { months, count = 1 }): Promise<string[]> => {
    if (months !== undefined && (!Number.isInteger(months) || months < 1 || months > maximumMonths)) {
      throw new Error(`months must be a whole number from 1 to ${maximumMonths}, or left out for permanent Premium.`);
    }

    if (!Number.isInteger(count) || count < 1 || count > maximumCodesPerRun) {
      throw new Error(`count must be a whole number from 1 to ${maximumCodesPerRun}.`);
    }

    const codes = Array.from({ length: count }, randomPremiumCode);
    await ctx.runMutation(internal.premiumCodes.store, { codes, months });

    return codes.map(readablePremiumCode);
  },
});

export const store = internalMutation({
  args: { codes: v.array(v.string()), months: v.optional(v.number()) },
  handler: async (ctx, { codes, months }) => {
    const createdAt = Date.now();

    for (const code of codes) {
      await ctx.db.insert('premiumCodes', { code, months, createdAt });
    }
  },
});

async function redeemCode(ctx: MutationCtx, { code }: { code: string }) {
  const { ownerId } = await requireTrustedSession(ctx);
  const premiumCode = await ctx.db
    .query('premiumCodes')
    .withIndex('by_code', (index) => index.eq('code', normalizePremiumCode(code)))
    .unique();

  if (premiumCode === null || premiumCode.redeemedAt !== undefined) {
    return { status: 'rejected' as const, error: premiumCodeInvalidError() };
  }

  const profile = await findProfile(ctx, ownerId);

  if (profile?.isPremium === true && profile.premiumUntil === undefined) {
    return { status: 'rejected' as const, error: premiumAlreadyPermanentError() };
  }

  const now = Date.now();
  const currentEnd = profile?.isPremium === true && profile.premiumUntil !== undefined ? profile.premiumUntil : now;
  const premiumUntil =
    premiumCode.months === undefined ? undefined : premiumEndAfter(Math.max(currentEnd, now), premiumCode.months);
  const grant = { isPremium: true, premiumSince: profile?.premiumSince ?? now, premiumUntil };

  if (profile === null) {
    await ctx.db.insert('profiles', { ownerId, ...grant });
  } else {
    await ctx.db.patch(profile._id, grant);
  }

  await ctx.db.patch(premiumCode._id, { redeemedAt: now });

  if (premiumUntil !== undefined) {
    await ctx.scheduler.runAt(premiumUntil, internal.premiumCodes.expire, { ownerId });
  }

  return { status: 'redeemed' as const, premiumUntil: premiumUntil ?? null };
}

export const redeem = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const result = await redeemCode(ctx, args);

    if (result.status === 'rejected') {
      throw new ConvexError(result.error);
    }

    return { premiumUntil: result.premiumUntil };
  },
});

export const redeemWithResult = mutation({
  args: { code: v.string() },
  handler: redeemCode,
});

export const expire = internalMutation({
  args: { ownerId: v.string() },
  handler: async (ctx, { ownerId }) => {
    const profile = await findProfile(ctx, ownerId);

    if (profile === null || profile.premiumUntil === undefined || profile.premiumUntil > Date.now()) {
      return;
    }

    await ctx.db.patch(profile._id, { isPremium: false, premiumSince: undefined, premiumUntil: undefined });
  },
});
