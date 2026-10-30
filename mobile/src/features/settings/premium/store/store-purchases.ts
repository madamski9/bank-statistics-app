import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type LOG_LEVEL,
  type PurchasesError,
  type PurchasesPackage,
  type PurchasesStoreProduct,
} from 'react-native-purchases';

import { appEnvironment } from '@/app-environment';

import { advertisedTrialDays, trialDays, type IntroEligibility, type StoreOfferingId } from './trial-offer';

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

export function redeemsOfferCodes(): boolean {
  return apiKey !== null && Platform.OS === 'ios';
}

export function presentOfferCodeRedemption(): Promise<void> {
  return Purchases.presentCodeRedemptionSheet();
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

async function introEligibility(productIds: string[]): Promise<Record<string, IntroEligibility>> {
  if (Platform.OS !== 'ios' || productIds.length === 0) {
    return {};
  }

  try {
    const statuses = await Purchases.checkTrialOrIntroductoryPriceEligibility(productIds);

    return Object.fromEntries(
      Object.entries(statuses).map(([productId, eligibility]) => [
        productId,
        eligibility.status === Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE
          ? 'eligible'
          : eligibility.status === Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE
            ? 'ineligible'
            : 'unknown',
      ]),
    );
  } catch {
    return {};
  }
}

function planOf(
  period: PremiumPlanPeriod,
  storePackage: PurchasesPackage | null,
  offersTrial: boolean,
  eligibility: Record<string, IntroEligibility>,
): PremiumPlan[] {
  if (storePackage === null) {
    return [];
  }

  const product = storePackage.product;

  return [
    {
      period,
      price: product.priceString,
      trialDays: offersTrial
        ? advertisedTrialDays(freeTrialDays(product), Platform.OS, eligibility[product.identifier] ?? 'unknown')
        : null,
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
  const packages = [offering.monthly, offering.annual].filter(
    (storePackage): storePackage is PurchasesPackage => storePackage !== null,
  );
  const eligibility = offersTrial ? await introEligibility(packages.map((storePackage) => storePackage.product.identifier)) : {};

  return [
    ...planOf('monthly', offering.monthly, offersTrial, eligibility),
    ...planOf('annual', offering.annual, offersTrial, eligibility),
  ];
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
