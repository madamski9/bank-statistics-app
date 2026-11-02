# RevenueCat setup

BankStats sells Premium through App Store and Google Play subscriptions managed by RevenueCat (ADR 0006). The code expects the identifiers below. Each delivery lane (development, preview, production) uses its own RevenueCat project or app, as `docs/PRODUCT-SPEC.md` requires.

## Identifiers the code relies on

| What | Identifier |
|---|---|
| Entitlement | `bank_stats_premium` |
| Offering without a trial | `standard` (mark it as the current offering) |
| Offering with the 14-day trial | `trial` |
| Packages in both offerings | `$rc_monthly` (Monthly) and `$rc_annual` (Annual) |

The app shows the `trial` offering once 15 real Transactions have been captured or when the user opens Premium from a locked feature. Otherwise it shows `standard`.

## Store products

Prices are 9.99 PLN monthly and 99.99 PLN yearly.

- **App Store Connect**: one subscription group, BankStats Premium, with four products: `premium_monthly` and `premium_annual` without an introductory offer, plus `premium_monthly_trial` and `premium_annual_trial` with a 14-day free introductory offer. Turn on Billing Grace Period for 16 days. Sign the Paid Apps agreement and join the App Store Small Business Program.
- **Google Play Console**: two subscriptions, `premium_monthly` and `premium_annual`, each with one base plan and one offer that adds a 14-day free trial. On Android both offerings can use the same products: in `standard` the app buys the base plan without the trial.
- **RevenueCat**: attach every product to the `bank_stats_premium` entitlement. Put the plain products in `standard` and the trial products in `trial`.

## Keys

| Key | Where it goes |
|---|---|
| Apple public SDK key (`appl_…`) | `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` in `mobile/.env.local` and in the EAS environment of the lane |
| Google public SDK key (`goog_…`) | `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` in the same places |
| Secret API key (v1, `sk_…`) | `npx convex env set REVENUECAT_SECRET_API_KEY …` on the lane's Convex deployment |
| Webhook authorization header value | `npx convex env set REVENUECAT_WEBHOOK_AUTHORIZATION …` and the same value in the RevenueCat webhook settings |
| Sandbox purchases | `npx convex env set REVENUECAT_ACCEPTS_SANDBOX true` on every deployment, production included. TestFlight builds and App Review only make sandbox purchases, so without it a tester or reviewer buys Premium and nothing unlocks. App Store customers cannot make sandbox purchases, so this only gives free Premium to invited TestFlight testers and Apple reviewers. |

The production lane refuses RevenueCat Test Store keys (`test_…`). Without a public key, the Premium screen keeps saying that purchases are coming soon.

Production uses the App Store app `com.bankstats.app.preview` in RevenueCat, and its webhook points at `https://content-bison-766.eu-west-1.convex.site/revenuecat/webhook` for both production and sandbox events.

## Webhook

In RevenueCat, add a webhook integration that points to `https://<deployment>.convex.site/revenuecat/webhook` and uses the authorization header value from above. Each event makes Convex read the customer back from RevenueCat, so replayed or out-of-order events cannot leave a stale entitlement. While RevenueCat is unreachable, the webhook answers 502 so RevenueCat retries, and the last known access stays in place.
