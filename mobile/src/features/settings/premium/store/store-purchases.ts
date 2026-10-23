import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type LOG_LEVEL,
  type PurchasesError,
  type PurchasesPackage,
  type PurchasesStoreProduct,
} from 'react-native-purchases';

import { appEnvironment } from '@/app-environment';

import { trialDays, type StoreOfferingId } from './trial-offer';

const premiumEntitlementId = 'bank_stats_premium';

const apiKey =
  Platform.OS === 'ios'
    ? appEnvironment.revenueCatApiKeys.ios
    : Platform.OS === 'android'
      ? appEnvironment.revenueCatApiKeys.android
      : null;

let configuredCustomerId: string | null = null;

export type PremiumPlanPeriod = 'monthly' | 'annual';

export interface PremiumPlan {
  period: PremiumPlanPeriod;
  price: string;
  trialDays: number | null;
  storePackage: PurchasesPackage;
}

function logStoreMessage(level: LOG_LEVEL, message: string) {
  console.info(`[RevenueCat ${level}] ${message}`);
}

export function sellsInApp(): boolean {
  return apiKey !== null;
}

export async function identifyStoreCustomer(ownerId: string): Promise<void> {
  if (apiKey === null || configuredCustomerId === ownerId) {
    return;
  }

  if (configuredCustomerId === null) {
    Purchases.setLogHandler(logStoreMessage);
    Purchases.configure({ apiKey, appUserID: ownerId });
  } else {
    await Purchases.logIn(ownerId);
  }

  configuredCustomerId = ownerId;
}

export function hasPremiumEntitlement(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[premiumEntitlementId] !== undefined;
}

function freeTrialDays(product: PurchasesStoreProduct): number | null {
  const freePhase = product.defaultOption?.freePhase;

  if (freePhase?.billingPeriod != null) {
    return trialDays(freePhase.billingPeriod.unit, freePhase.billingPeriod.value);
  }

  const introPrice = product.introPrice;

  return introPrice !== null && introPrice.price === 0
    ? trialDays(introPrice.periodUnit, introPrice.periodNumberOfUnits * introPrice.cycles)
    : null;
}

function planOf(period: PremiumPlanPeriod, storePackage: PurchasesPackage | null, offersTrial: boolean): PremiumPlan[] {
  if (storePackage === null) {
    return [];
  }

  return [
    {
      period,
      price: storePackage.product.priceString,
      trialDays: offersTrial ? freeTrialDays(storePackage.product) : null,
      storePackage,
    },
  ];
}

export async function loadPremiumPlans(offeringId: StoreOfferingId): Promise<PremiumPlan[]> {
  const offerings = await Purchases.getOfferings();
  const offering = offerings.all[offeringId] ?? offerings.current;

  if (offering === null) {
    return [];
  }

  const offersTrial = offering.identifier === 'trial';

  return [...planOf('monthly', offering.monthly, offersTrial), ...planOf('annual', offering.annual, offersTrial)];
}

export async function purchasePremiumPlan(plan: PremiumPlan): Promise<CustomerInfo> {
  const basePlan = plan.storePackage.product.subscriptionOptions?.find((option) => option.isBasePlan);

  if (plan.trialDays === null && basePlan !== undefined) {
    return (await Purchases.purchaseSubscriptionOption(basePlan)).customerInfo;
  }

  return (await Purchases.purchasePackage(plan.storePackage)).customerInfo;
}

export function restoreStorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export function isPurchaseCancelled(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as PurchasesError).code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
}
