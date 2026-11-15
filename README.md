# BankStats

**BankStats** is a privacy-first spending tracker for iPhone. It turns the push notifications your bank and Apple Wallet already send into a clean, categorized history of where your money goes, without asking for a bank login or connecting to your bank account.

Notifications are read and interpreted on the phone. Transactions live in an encrypted local database, and cloud sync across your devices is optional. On top of that history, BankStats shows spending by shop, person and category, tracks limits with notifications in the tone you choose, and puts the numbers on your Home Screen and Lock Screen.

Website: [bankstats.app](https://bankstats.app) · Product specification: [docs/PRODUCT-SPEC.md](docs/PRODUCT-SPEC.md)

## Technology stack

<div align="center">

| Area | Technology |
|:---:|:---:|
| Mobile application | <img height="32" src="https://img.shields.io/badge/Expo%20SDK%2057-000020?style=for-the-badge&logo=expo&logoColor=white"><img height="32" src="https://img.shields.io/badge/React%20Native%200.86-61DAFB?style=for-the-badge&logo=react&logoColor=black"><img height="32" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white"><img height="32" src="https://img.shields.io/badge/Expo%20Router-000020?style=for-the-badge&logo=expo&logoColor=white"><img height="32" src="https://img.shields.io/badge/Reanimated-6B52AE?style=for-the-badge&logo=react&logoColor=white"> |
| Native modules | <img height="32" src="https://img.shields.io/badge/Swift-F05138?style=for-the-badge&logo=swift&logoColor=white"><img height="32" src="https://img.shields.io/badge/App%20Intents-000000?style=for-the-badge&logo=apple&logoColor=white"><img height="32" src="https://img.shields.io/badge/Kotlin-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white"><img height="32" src="https://img.shields.io/badge/Expo%20Modules-000020?style=for-the-badge&logo=expo&logoColor=white"> |
| Widgets | <img height="32" src="https://img.shields.io/badge/expo--widgets-000020?style=for-the-badge&logo=expo&logoColor=white"><img height="32" src="https://img.shields.io/badge/WidgetKit-000000?style=for-the-badge&logo=apple&logoColor=white"> |
| Local storage | <img height="32" src="https://img.shields.io/badge/SQLCipher-003B57?style=for-the-badge&logo=sqlite&logoColor=white"><img height="32" src="https://img.shields.io/badge/Keychain-000000?style=for-the-badge&logo=apple&logoColor=white"> |
| Backend and sync | <img height="32" src="https://img.shields.io/badge/Convex-EE342F?style=for-the-badge&logoColor=white"><img height="32" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white"> |
| Authentication | <img height="32" src="https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white"><img height="32" src="https://img.shields.io/badge/Sign%20in%20with%20Apple-000000?style=for-the-badge&logo=apple&logoColor=white"><img height="32" src="https://img.shields.io/badge/Google-4285F4?style=for-the-badge&logo=google&logoColor=white"> |
| Subscriptions | <img height="32" src="https://img.shields.io/badge/RevenueCat-F25A5A?style=for-the-badge&logoColor=white"><img height="32" src="https://img.shields.io/badge/App%20Store-0D96F6?style=for-the-badge&logo=appstore&logoColor=white"> |
| Exchange rates | <img height="32" src="https://img.shields.io/badge/NBP%20API-1F4E79?style=for-the-badge&logoColor=white"> |
| Website | <img height="32" src="https://img.shields.io/badge/HTML-E34F26?style=for-the-badge&logo=html5&logoColor=white"><img height="32" src="https://img.shields.io/badge/CSS-663399?style=for-the-badge&logo=css&logoColor=white"><img height="32" src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black"><img height="32" src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white"><img height="32" src="https://img.shields.io/badge/Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white"> |
| Tooling | <img height="32" src="https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white"><img height="32" src="https://img.shields.io/badge/EAS%20Build-000020?style=for-the-badge&logo=expo&logoColor=white"><img height="32" src="https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white"><img height="32" src="https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white"> |

</div>

## Table of contents

- [Features](#features)
- [Preview](#preview)
- [How a transaction is captured](#how-a-transaction-is-captured)
- [Workspace](#workspace)
- [Delivery lanes](#delivery-lanes)
- [Development](#development)
- [Verification](#verification)

## Features

- **No bank connection**: transactions come from notifications of supported banks (Millennium, PKO BP, ING, mBank, Erste) and Apple Wallet, captured by a Shortcuts automation. Revolut is coming soon.
- **On-device parsing**: shared, versioned bank rules are interpreted natively in Swift and Kotlin. Raw notification text never leaves the phone.
- **Wallet and bank pairing**: an Apple Pay purchase produces a Wallet push and a bank push. BankStats silently merges them into one transaction named after the Wallet shop, and drops a bank push captured twice.
- **Encrypted local storage**: SQLCipher database on the device, keys in the Keychain.
- **Optional cloud sync**: Convex keeps your devices in sync, can be turned off per device, and the cloud copy can be deleted on its own.
- **Overview**: income, spending and net flow for this month, a week, a month, three months, a year or all time, compared with the previous period.
- **Shops, people and categories**: rankings with a detail view per shop, its own period filter, a spending chart and history.
- **Limits and alerts**: spending limits for everything, a category or a shop, with passive, mildly aggressive or very aggressive notification tones.
- **Insights**: monthly report, forecast, recurring payments and events that group spending from a trip or a renovation.
- **Widgets**: Home Screen and Lock Screen widgets.
- **Foreign currencies**: payments abroad are converted to PLN with the National Bank of Poland exchange rates.
- **Statement import**: PDF statements are read on the device to fill gaps in the history.
- **Your data**: CSV and JSON export, device revocation and full account deletion, including the RevenueCat customer.
- **BankStats Premium**: monthly or yearly subscription through the App Store, with a free trial and offer codes.

## Preview

<div align="center">

| Overview | Spending | Monthly report | Shops |
|:---:|:---:|:---:|:---:|
| <img src="website/screenshots/overview.png" width="200" alt="Overview with income, spending and net flow"> | <img src="website/screenshots/spending.png" width="200" alt="Spending chart with shops ranked by amount"> | <img src="website/screenshots/monthly-report.png" width="200" alt="Monthly spending report"> | <img src="website/screenshots/shops.png" width="200" alt="Shops ranked by spending"> |

</div>

## How a transaction is captured

```
Bank or Wallet push
        │
        ▼
Shortcuts automation ──► "Capture Bank Notification" App Intent
        │
        ▼
Encrypted inbox (SQLCipher) ──► shared bank rules ──► normalized transaction
        │                                                    │
        │                         Wallet ↔ bank pairing, repeat check
        ▼                                                    ▼
Unrecognized notifications wait                     encrypted outbox on the phone
for review on the device                                     │
                                                             ▼
                                              optional sync to Convex
```

## Workspace

A bun workspace with one boundary per concern:

| Package                       | Contents                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `mobile`                      | Expo application, organized by product feature ([ADR 0014](docs/adr/0014-organize-frontend-code-by-feature.md)) |
| `packages/app-config`         | Delivery lane resolution and runtime support checks                            |
| `packages/parser-rules`       | Shared versioned bank rules ([ADR 0005](docs/adr/0005-share-parser-rules-across-native-interpreters.md)) |
| `packages/ingestion-native`   | Swift and Kotlin ingestion modules ([ADR 0004](docs/adr/0004-use-expo-with-native-platform-modules.md)) |
| `services/convex`             | Convex functions, schema, and auth configuration                               |
| `website`                     | Static landing page, privacy policy, support and account deletion pages        |

## Delivery lanes

Every build belongs to exactly one lane, declared by `EXPO_PUBLIC_APP_ENV`:

| Lane          | Bundle identifier            | Scheme               | Clerk credentials |
| ------------- | ---------------------------- | -------------------- | ----------------- |
| `development` | `com.bankstats.app.dev`      | `bankstats-dev`      | `pk_test_…`       |
| `preview`     | `com.bankstats.app.preview`  | `bankstats-preview`  | `pk_test_…`       |
| `production`  | `com.bankstats.app.preview`  | `bankstats`          | `pk_live_…`       |

Development installs side by side with the other lanes. Preview and production share `com.bankstats.app.preview`, so TestFlight and the App Store ship the same app and the Shortcuts automations bound to it keep working. Lanes never share deep links. Nothing defaults to a lane: the Expo config
fails if `EXPO_PUBLIC_APP_ENV` is unset, and the application refuses to start when a lane is paired
with credentials belonging to another one — a preview build cannot silently run on production Clerk
keys, and a production build cannot ship pointing at a test instance.

## Development

Expo Go is not a supported runtime ([ADR 0004](docs/adr/0004-use-expo-with-native-platform-modules.md)); the app rejects it at startup. Use a development build.

After completing the mobile setup (see [mobile/README.md](mobile/README.md)), build, install, and run the app together with Convex:

```bash
./run.sh ios
./run.sh android
./run.sh web      # browser, no native modules
./run.sh start    # bundler only, once a dev build is already installed
```

## Verification

```bash
bun run typecheck
bun test
bun run lint
```

The same checks run in GitHub Actions on every pull request, together with `expo-doctor`, the Swift parser-rule conformance and the native pairing and encrypted inbox conformance suites.

By NikkO and Maciuś
