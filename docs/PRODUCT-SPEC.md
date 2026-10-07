# BankStats Product Specification

Status: approved product direction

Working name: BankStats

Initial market: private individuals in Poland

Platforms: iOS 27+ and Android 11+

## Problem Statement

People who want to understand their spending often need to connect a bank account, import files, or enter every transaction manually. These approaches create friction, require significant trust, and may still fail to provide a simple view across several banks.

BankStats should turn notifications already emitted by supported banking applications into useful personal cash-flow statistics. A user should be able to understand expenses, income, merchants, counterparties, and self-defined limits without giving the product bank credentials or access to a bank account.

The product must be explicit that it reconstructs cash flow from observed bank notifications. It does not know the user's true account balance and cannot guarantee that every financial movement was observed.

## Solution

BankStats is a minimalist React Native mobile application for iOS and Android. It captures notifications from supported banking applications, interprets them locally, stores normalized transactions in an encrypted local outbox, and synchronizes only normalized data to Convex. Clerk provides authentication and RevenueCat manages Premium entitlements.

The current iOS capture path supports Millennium. mBank, Revolut, and PKO BP appear as upcoming banks until their notification parsers and capture paths are verified. iOS uses an automation configured in Apple's Shortcuts application to pass selected banking notifications into a BankStats App Intent. Android uses Notification Access and a Notification Listener Service restricted to explicitly supported banking applications.

The home view uses three glass-like bubbles for Expenses, Income, and Net Flow. Selecting a bubble smoothly expands it beyond the viewport so the user appears to enter it, revealing detailed charts and breakdowns. The experience follows the restraint and clarity associated with Trade Republic without copying its screens or identity.

BankStats earns revenue through an optional Premium subscription. The free product remains useful for capture, corrections, history, basic statistics, one active alert rule, one basic widget, synchronization, and data export. Premium adds unlimited alerts, advanced analysis, automation rules, configurable widgets, and polished reports.

## Product Principles

- Earn trust through local processing, clear disclosures, and restrained permissions.
- Show observed cash flow and never imply access to a true bank balance.
- Keep the primary experience on one surface with progressive detail.
- Automate confident interpretations and provide a focused review flow for uncertainty.
- Preserve user control over corrections, alerts, privacy, exports, and deletion.
- Use neutral language without shame, financial judgment, or addictive gamification.
- Keep free capture and ownership of personal data independent of the subscription.

## User Stories

1. As a private individual in Poland, I want to understand expenses and income from bank notifications, so that I do not need to enter every transaction manually.
2. As a privacy-conscious user, I want to use the product without connecting my bank account, so that I never share bank credentials with BankStats.
3. As a new user, I want a short explanation of how capture works, so that I can decide whether I trust the product before granting access.
4. As an iPhone user, I want guided Shortcuts setup for selected banking applications, so that their notifications can reach BankStats automatically.
5. As an iPhone user, I want the setup to explain every manual approval required by iOS, so that I can complete the automation successfully.
6. As an Android user, I want a clear disclosure before Notification Access opens, so that I understand what BankStats reads and why.
7. As a user of several banks, I want to enable each supported bank separately, so that I control which notifications BankStats processes.
8. As a user, I want a capture test during onboarding, so that I know my configuration works before relying on it.
9. As a user, I want to see whether each Capture Configuration is working, needs attention, or remains unconfigured, so that I can fix only real problems.
10. As a user, I want capture to work while the screen is locked, so that transactions are not missed during ordinary use.
11. As an offline user, I want captured transactions retained safely until connectivity returns, so that temporary network loss does not lose data.
12. As a user, I want raw notification text interpreted on my device, so that sensitive message content does not enter the cloud.
13. As a user, I want confident raw notification text deleted immediately, so that BankStats retains only the information needed for statistics.
14. As a user, I want uncertain raw notification text encrypted and removed after review or expiry, so that review remains possible without indefinite retention.
15. As a user, I want only notifications from supported banking applications accepted, so that unrelated messages cannot become transactions.
16. As a user, I want declined operations excluded, so that failed payments do not distort my spending.
17. As a user, I want card payments, BLIK payments, transfers, withdrawals, refunds, fees, and interest recognized, so that the timeline reflects common financial activity.
18. As a user, I want pending, posted, and reversed states represented, so that changes in a bank's notification sequence do not double-count money.
19. As a user, I want duplicate messages recognized across devices, so that one financial movement appears once.
20. As a user, I want uncertain duplicates placed in review, so that BankStats does not silently discard a legitimate transaction.
21. As a user, I want transactions assigned to a Financial Account when the notification identifies it, so that I can understand activity across accounts and cards.
22. As a user, I want an editable general account when a notification lacks account details, so that incomplete messages still remain useful.
23. As a user, I want the original amount and currency preserved, so that I can verify what the bank reported.
24. As a user, I want foreign transactions converted to PLN using the historical NBP rate, so that my statistics use one stable reporting currency.
25. As a user, I want conversion retried when NBP is temporarily unavailable, so that ingestion continues without inventing a rate.
26. As a user, I want incoming and outgoing transfers to identify a Counterparty separately from a Merchant, so that personal transfers do not pollute store statistics.
27. As a user, I want common merchant labels normalized, so that variants of the same store appear together.
28. As a user, I want to correct a merchant or category, so that a wrong automatic interpretation does not remain in my statistics.
29. As a Premium user, I want a correction applied to future matching transactions, so that recurring labels are categorized automatically.
30. As a user, I want uncertain amount, currency, or direction withheld from statistics until confirmation, so that uncertain values cannot corrupt totals.
31. As a user, I want uncertain merchant or category information included as uncategorized, so that a usable financial movement is not hidden.
32. As a user, I want to add, edit, and delete manual transactions, so that I can cover activity that produced no supported notification.
33. As a user, I want a chronological transaction list with compact rows, so that I can scan recent activity quickly.
34. As a user, I want each transaction row to show its name or category, amount, bank or account, and date, so that it contains enough context without clutter.
35. As a user, I want badges shown only for exceptional states, so that the normal timeline stays quiet.
36. As a user, I want the home view to emphasize Expenses, Income, and Net Flow, so that the key period totals are immediately understandable.
37. As a user, I want Net Flow clearly described as income minus expenses for a period, so that I never confuse it with a bank balance.
38. As a user, I want the Expenses bubble to be largest, Income medium, and Net Flow smallest, so that the screen has a stable visual hierarchy.
39. As a user, I want bubble size to remain stable rather than reflect money magnitude, so that large values do not make the interface unpredictable.
40. As a user, I want a selected bubble to expand smoothly into its detail view, so that navigation feels spatial and continuous.
41. As a user, I want to dismiss a detail view with a downward gesture, so that the transition reverses naturally.
42. As a user, I want detailed charts outside the home view, so that the main screen remains minimal.
43. As a user, I want week, month, three-month, year, and all-time ranges, so that I can inspect both recent and long-term patterns.
44. As a user, I want expenses and income broken down by category, merchant, Counterparty, and transaction, where applicable, so that totals remain explainable.
45. As a user, I want a subtle comparison with the previous period, so that I can see change without a visually noisy dashboard.
46. As a user, I want only Overview and Transactions as persistent top-level destinations, so that navigation remains simple.
47. As a user, I want settings and account controls behind a compact avatar entry, so that administrative features do not dominate the product.
48. As a user, I want light and dark themes, so that the application follows my preferred appearance.
49. As a user with reduced-transparency enabled, I want readable opaque surfaces, so that glass effects never reduce accessibility.
50. As a user with reduced-motion enabled, I want a simple fade instead of a large spatial animation, so that navigation remains comfortable.
51. As a user, I want to create an alert for expense, income, or net flow, so that BankStats can notify me about a goal or threshold I chose.
52. As a user, I want an alert scoped to all activity, a Merchant, Counterparty, or Category, so that the rule matches my intent.
53. As a user, I want weekly, monthly, yearly, and custom one-time alert periods, so that I can plan over the period that matters to me.
54. As a user, I want amount, percentage, and missing-expected-income conditions, so that alerts cover both budgets and expected cash flow.
55. As a free user, I want to create and replace one active Alert Rule, so that I can benefit from proactive monitoring before subscribing.
56. As a Premium user, I want unlimited active Alert Rules, so that I can monitor several goals at once.
57. As a user, I want alerts sent once for each reached threshold, so that a rule does not create repeated noise.
58. As a user, I want neutral alert wording, so that financial monitoring does not shame or pressure me.
59. As a user, I want push permission requested when I create my first alert, so that the permission request has clear context.
60. As a free user, I want a basic widget showing monthly expenses, so that I can check progress without opening the application.
61. As a user, I want to blur the widget and reveal it with Face ID or my PIN, so that bystanders cannot see private information when I choose.
62. As a Premium user, I want configurable widgets, so that I can monitor the metric or limit most useful to me.
63. As a user, I want Sign in with Apple, Google, or an email code, so that authentication is quick and does not require a password.
64. As a user with several devices, I want one identity and synchronized normalized transactions, so that the same history is available everywhere.
65. As a user, I want to see and revoke authorized devices, so that I retain control over installations with access to my data.
66. As a user, I want to protect the application with biometrics, so that someone holding my unlocked phone cannot immediately see financial data.
67. As a user, I want configurable lock timing, so that I can choose immediate, one-minute, or five-minute protection.
68. As a user, I want financial values obscured in the operating-system app switcher, so that previews do not expose them.
69. As a user, I want a privacy mode that hides amounts in the application, so that I can open it around other people.
70. As a user, I want free CSV and JSON export, so that access to my own data is not tied to Premium.
71. As a user, I want account deletion available inside the application, so that I can erase my cloud data and identity without contacting support.
72. As a subscribed user deleting an account, I want a clear subscription-management link, so that I understand store billing is handled separately.
73. As a user with a parsing problem, I want to inspect a redacted preview and explicitly submit one Diagnostic Sample, so that I can help improve recognition without exposing unrelated data.
74. As a user, I want crashes and product analytics collected without amounts, merchants, counterparties, or notification text, so that operational monitoring cannot reconstruct my finances.
75. As a Premium subscriber, I want advanced comparisons and analytics, so that the subscription provides deeper financial insight.
76. As a Premium subscriber, I want custom Categories and Categorization Rules, so that statistics reflect my personal organization.
77. As a Premium subscriber, I want polished and scheduled reports, so that I can review or share a stable summary.
78. As a subscriber moving between platforms, I want purchases restored and synchronized, so that my entitlement follows my BankStats identity.
79. As a potential subscriber, I want the trial offered after BankStats has captured meaningful activity or I choose a Premium feature, so that I can evaluate value at the right moment.
80. As a Polish user, I want the initial interface in Polish, so that bank and financial terminology feels familiar.
81. As a future international user, I want the product built with localization support, so that new languages do not require redesigning the interface.

## Implementation Decisions

### Scope and terminology

- A Bank Notification is raw input and is never treated as a Transaction until local normalization succeeds.
- A Transaction is a normalized money movement inferred from one or more Bank Notifications or entered manually.
- A Transaction has income or expense direction and pending, posted, or reversed status.
- Declined operations are not Transactions.
- Merchant and Counterparty remain separate domain concepts. Merchant statistics exclude personal counterparties.
- A Category may remain unknown without excluding a valid Transaction from cash-flow totals.
- A Review Item blocks a Transaction from statistics only when amount, currency, or direction is uncertain.
- A Financial Account is separate from a Supported Bank. Each Supported Bank has a user-renamable general account as a fallback.
- Original Amount and Reporting Amount are distinct. The default reporting currency is PLN.
- Net Flow means income minus expenses over the selected period. It is never called or presented as an account balance.

### Supported activity

- The MVP recognizes card payments, BLIK payments, incoming transfers, outgoing transfers, ATM withdrawals, refunds, bank fees, interest, manual entries, and an `other` fallback.
- Millennium is the first enabled Supported Bank. mBank, Revolut, and PKO BP remain unavailable in setup until their capture paths are implemented and verified.
- Capture accepts only explicitly allowlisted application identifiers for enabled Supported Banks.
- The data model retains both occurrence and capture timestamps in UTC plus the source timezone and local calendar date.
- Monetary amounts use integer minor units and ISO currency codes. Floating-point values are prohibited for money.

### Mobile architecture

- The product uses React Native with Expo development builds and generated native projects.
- Expo Go is not a supported runtime because the product requires native extensions, services, encrypted storage, and widgets.
- Swift and Kotlin modules own notification ingestion while the React Native layer owns the shared product interface.
- If Expo-generated iOS extension targets are unreliable, native projects remain committed and maintained directly while the application continues to use Expo tooling.
- The frontend is organized by product feature. A feature owns its components, hooks, state, validation, and tests. Shared code is extracted only for stable concepts used by multiple features.
- Source code contains no inline comments, block comments, documentation comments, or TODO comments. Naming and structure carry intent.
- TypeScript strict mode is required.

### iOS capture

- iOS 27 is the minimum supported version because the product depends on notification-based personal automation in Shortcuts.
- BankStats exposes an App Intent that accepts notification text and source context and writes a locally normalized result to the shared encrypted outbox.
- Onboarding guides the user through selecting enabled Supported Banks and configuring the corresponding Shortcuts automation.
- The user must review and approve every automation step required by iOS.
- A technical spike must verify the exact public iOS 27 API surface for generating or sharing a Shortcut artifact. If programmatic creation is unavailable, the supported flow is a guided manual automation that invokes the BankStats App Intent.
- Successful setup is proven with a synthetic control input; onboarding does not require a real purchase.

### Android capture

- Android 11 is the minimum supported version.
- A Notification Listener Service receives posted notifications after the user grants Notification Access.
- A prominent in-app disclosure explains the data accessed, its purpose, local parsing, and cloud boundary before the operating-system settings page opens.
- Package allowlisting and enabled-bank configuration are applied before parsing.
- The collector must work when the React Native runtime is inactive.

### Local parsing and rules

- Raw Bank Notification text is parsed locally and is never sent to Convex.
- Swift and Kotlin use thin native interpreters over one versioned JSON rule bundle and one set of sanitized golden examples.
- Initial recognition is deterministic and bank-specific. The MVP does not embed or train a language model.
- Rule bundles live in version control and ship with the application.
- Devices may download a newer bundle from Convex only after validating an offline-key signature.
- The application retains a bundled fallback and the last known working bundle for rollback.
- Remote configuration can disable ingestion for a broken bank/version combination without disabling other banks.
- Confident raw text is deleted immediately after normalization.
- Uncertain raw text is encrypted locally, retained for at most 30 days, and deleted after confirmation or expiry.
- Parser development requires 20–30 sanitized representative examples per Supported Bank, including successful operations, reversals, duplicates, foreign currencies, malformed messages, and declined operations.

### Local storage and synchronization

- Native collectors and the React Native host share one SQLCipher-backed SQLite outbox.
- Its encryption key is held in the platform secure store.
- A normalized record moves through pending, syncing, synced, or failed states.
- The main application synchronizes when connectivity and a valid Clerk session are available.
- Capture must remain durable when offline, when the screen is locked, and when the React Native runtime is not active.
- Client-generated identifiers make retries idempotent.
- Deduplication combines a stable fingerprint with a bounded time window and known notification lifecycle rules.
- Clear duplicates merge automatically; ambiguous duplicates create a Review Item.
- The local schema carries a version number and supports migration from at least the previous released outbox version.

### Cloud data and services

- Convex stores only normalized Transactions, Review Items without raw text, Financial Accounts, Categories, private correction rules, Alert Rules, Alerts, device metadata, entitlements, exchange-rate snapshots, and limited operational metadata.
- Clerk is the identity source. Its stable user identifier scopes Convex data and identifies the RevenueCat customer.
- Email addresses are not durable data or billing identifiers.
- Separate development, preview, and production environments use separate Clerk, Convex, RevenueCat, application identifiers, signing material, and push credentials.
- Production Convex data is hosted in EU West, Ireland.
- Automatic daily and weekly backups are enabled before external users depend on production.
- Transactions remain until the user deletes them.
- Deleted-transaction fingerprints remain for 90 days to prevent immediate re-import.
- Redacted Diagnostic Samples remain for 90 days.
- Technical logs remain for 30 days.

### Currency conversion

- Convex obtains and caches the NBP historical rate for the Transaction occurrence date.
- Every conversion stores the exact Exchange Rate Snapshot used so historical reports remain stable.
- If NBP is unavailable, the original Transaction synchronizes and conversion remains pending for retry.
- The first release reports totals in PLN while retaining every Original Amount and currency.

### Product interface

- Persistent top navigation contains text destinations for `Przegląd` and `Transakcje` plus an avatar entry for settings.
- There is no bottom tab bar.
- The Overview has no chart at rest. It displays glass-like bubbles for `Wydatki`, `Przychody`, and `Bilans`.
- Expenses is the largest bubble, Income is medium, and Net Flow is smallest. Sizes express hierarchy rather than monetary proportion.
- On selection, the bubble receives light haptic feedback, moves toward the center, grows beyond the viewport, retains the amount as a visual anchor, and reveals detail content.
- The full-screen detail presents the relevant chart, categories, Merchants or Counterparties, and Transactions.
- A downward gesture reverses the transition.
- iOS uses the current official native glass effect through Expo-compatible integration. Android uses a platform-appropriate blur, depth, and material treatment rather than imitating unsupported iOS rendering.
- Geometry, masks, background, and inner content animate separately. The glass host itself is not opacity-animated.
- Time ranges are week, month, three months, year, and all time.
- Charts use daily, weekly, or monthly aggregation appropriate to the selected range and may include a subtle previous-period comparison.
- The Transactions view uses compact rows with an icon or logo, primary name or Category, amount, Supported Bank or Financial Account, and date. State badges appear only when needed.
- A small bottom-right add action on the Transactions view opens manual entry.
- Light and dark themes ship together.
- Reduced Transparency replaces glass with opaque, high-contrast surfaces. Reduced Motion replaces the bubble expansion with a simple fade.

### Onboarding and configuration

- Onboarding presents the promise, explains notification-derived coverage and limitations, states that parsing is local and data is not sold, establishes a Clerk session, gathers platform and bank choices, guides permissions or Shortcuts setup, runs a control test, and opens Overview.
- Subscription offers do not interrupt initial onboarding.
- A Capture Configuration can be working, require attention, or remain unconfigured.
- Capture health uses concrete evidence such as permissions, a completed control test, and recent successful collector execution. Lack of spending alone is not treated as failure.
- Settings expose enabled Supported Banks, last successful capture, a repeatable control test, privacy controls, device management, export, subscription management, and account deletion.

### Alerts and push delivery

- An Alert Rule can evaluate expenses, income, or Net Flow.
- Its scope may be all activity, one Merchant, one Counterparty, or one Category.
- Its period may be weekly, monthly, yearly, or a custom one-time interval.
- Conditions include a fixed amount, a percentage of a target, or missing expected income.
- Convex evaluates rules after normalized Transactions synchronize.
- The backend records one alert job for each newly reached threshold.
- A server-side outbox sends through Expo Push Service, records receipts, retries transient failures, and prevents duplicate sends.
- Push tokens belong to Devices rather than directly to Users.
- Alert delivery can be delayed while a capture device is offline; the application communicates that alerts follow synchronized activity.
- Free accounts may have one active Alert Rule and may edit or replace it.
- Premium accounts may have unlimited active Alert Rules.
- On downgrade, all rules remain stored but only one chosen rule remains active.
- Push permission is requested while creating the first Alert Rule.

### Widgets

- iOS and Android ship a small free widget showing current-month expenses.
- A medium widget can show a selected limit and recent transaction summary when supported by the platform implementation.
- Amounts are hidden on the locked screen by default.
- Premium enables configurable widget metrics and rules.
- Widget data uses a privacy-safe local snapshot produced by the main application after synchronization.

### Authentication, purchases, and monetization

- Clerk provides custom minimalist Sign in with Apple, Google sign-in, and email-code authentication.
- RevenueCat manages App Store and Google Play purchases and maps them to the stable Clerk-backed internal identity.
- Convex mirrors the current entitlement and enforces server-side Premium limits.
- The planned price is 9.99 PLN monthly or 99.99 PLN yearly. Purchases remain unavailable until RevenueCat integration is complete.
- The product offers a 14-day trial only after at least 15 real Transactions have been captured or the user intentionally chooses a Premium feature.
- There is no lifetime purchase in the initial release.
- The free product includes capture for enabled Supported Banks, manual changes, review and corrections, spending charts and statistics for up to one month, one active Alert Rule, one basic widget, multi-device sync, and CSV/JSON export. Stored transactions remain available for synchronization and export.
- Premium includes unlimited Alert Rules, longer spending and chart ranges, advanced comparisons and analytics, a shared account, custom Categories and future Categorization Rules, configurable widgets, and polished or scheduled reports.
- The product does not show advertising, sell financial data, or promote loans for commission.
- A visible restore-purchases action is available. The application silently synchronizes known purchases after authentication where platform policy permits.
- Store subscriptions use the configured free trial and a 16-day Apple billing grace period.
- Gift codes grant Premium for a chosen number of months or for good. Each code works once, is created with `npx convex run premiumCodes:create`, and is entered under "I have a code" on the Premium screen. A gift that runs out returns the account to the free product, and a later gift extends a running one. Before the App Store release, the in-app code field is replaced by App Store and Google Play offer codes redeemed through RevenueCat, because App Store Review Guideline 3.1.1 forbids unlocking features with the application's own codes.

### Privacy, security, and compliance

- Biometric application lock is available to all users with immediate, one-minute, or five-minute timeout. A 4-digit PIN, set during onboarding or in settings, unlocks the application when biometrics fail or are unavailable.
- Financial values are obscured in operating-system task switchers.
- Screenshots remain allowed, while Privacy Mode hides amounts inside the application.
- Widgets are blurred by default, which also keeps amounts off the locked screen. Users can turn the blur off in settings; tapping a blurred widget asks for Face ID or the PIN and reveals it for five minutes.
- Sentry may collect crashes without session replay.
- Telemetry never contains amounts, Merchants, Counterparties, Bank Notification text, screenshots, or raw notification payloads.
- Product analytics uses only first-party aggregate events that cannot reconstruct financial activity.
- A Diagnostic Sample leaves the device only after an explicit action and a redacted preview. Submission is limited to one selected sample per action.
- The product is for users aged 18 or older.
- Privacy Policy, Terms, SDK/subprocessor disclosures, retention terms, Apple App Privacy answers, and Google Play Data Safety answers must be complete before external beta.
- Android shows a prominent disclosure and receives user consent before requesting Notification Access.
- Account deletion requires recent authentication, warns that deletion does not cancel an App Store or Google Play subscription, links to subscription management, deletes Convex data, removes the RevenueCat customer record where supported, revokes Sign in with Apple where applicable, and deletes the Clerk identity.
- A public web URL supports Google Play's account-deletion requirement.
- The product is published through an organization developer account and described as a spending and cash-flow tracker rather than a bank, payment service, investment product, or financial adviser.

### Delivery and release strategy

- The first implementation phase proves one complete technical path before product UI work: iOS Shortcuts trigger to App Intent to encrypted outbox, Android notification listener to bank allowlist, one Millennium parser, and a simple React Native diagnostic surface.
- The iOS technical spike is a release gate. It must establish what Apple publicly permits for creating, sharing, and approving the personal automation.
- Parser rule changes are versioned, tested in both native interpreters, signed with an offline key, and recoverable through rollback.
- GitHub Actions performs static checks and native parser conformance tests. EAS builds development, preview, and production artifacts.
- Internal testing uses an iPhone running iOS 27, a physical Samsung device on Android 11 or later, and a current Pixel device or emulator.
- Both platforms enter beta together, with slight testing emphasis on iOS.
- Beta begins with 5–10 technical testers and expands to 30–50 testers after the capture pipeline is stable.
- Distribution uses TestFlight and Google Play closed testing.
- Public launch waits until both platforms meet the same acceptance gates.
- Final product name, bundle identifiers, package identifiers, domains, and store metadata are chosen before store submission. `BankStats` remains the working name.

## Testing Decisions

Tests verify externally observable behavior at the highest stable seam. They should prove that a representative input produces the expected durable product result and avoid assertions about private helper functions, internal call order, or framework structure. This is a new repository, so there is no existing test prior art to preserve.

The primary product seam begins with a bank-specific sanitized notification fixture and ends with the normalized Transaction contract. The same golden corpus runs against Swift and Kotlin interpreters. For each fixture, both platforms must agree on whether to ignore, create, update, reverse, or review an operation and must agree on amount, currency, direction, type, status, occurrence time, and normalized entities.

Platform capture tests prove one complete local path on real or simulated devices: an allowlisted notification reaches the native collector, is normalized without requiring the React Native runtime, enters the encrypted outbox, and appears on a diagnostic surface. Tests also prove that non-allowlisted applications and declined operations do not create Transactions.

Signed-rule tests prove acceptance of a valid newer bundle, rejection of an invalid signature or incompatible schema, use of the bundled fallback, and rollback to the last working version.

Synchronization tests begin with normalized outbox records and end with the user-visible cloud-backed timeline. They cover offline retry, idempotency, multi-device duplicate detection, ambiguous Review Items, reversal sequences, local schema migration, and isolation between Clerk identities.

Currency tests begin with a foreign-currency Transaction and a controlled NBP response. They prove the correct occurrence-date rate, integer-safe conversion, stored Exchange Rate Snapshot, stable historical totals, and pending conversion during upstream failure.

Product-flow tests cover sign-in, onboarding, per-bank configuration, capture control tests, manual transactions, corrections, review, Overview totals, bubble detail navigation, time ranges, and export. Assertions focus on visible state and durable records.

Alert tests begin with synchronized Transactions and configured Alert Rules and end with exactly one durable push job for each crossed threshold. They cover all scopes and periods, retries, multi-device tokens, delayed sync, rule replacement, Premium limits, and downgrade behavior.

Entitlement tests begin with RevenueCat webhook fixtures and end with Convex-authorized product behavior. They cover purchase, trial, renewal, billing grace, cancellation, expiry, restoration, cross-platform identity, webhook replay, and temporary provider failure.

Privacy and lifecycle tests prove that raw Bank Notification text never appears in Convex requests, logs, telemetry, crash reports, analytics, or exports. They also verify retention expiry, biometric lock timing, app-switcher obscuring, widget lock-screen behavior, device revocation, export completeness, and ordered account deletion.

Accessibility tests cover screen-reader labels, dynamic type, contrast, keyboard or switch navigation where applicable, Reduced Transparency, Reduced Motion, light theme, and dark theme. Motion tests verify the bubble transition and its reversible dismissal without relying on pixel-perfect implementation snapshots.

Before public launch, the parser corpus must demonstrate at least 98% accuracy for amount, currency, and direction; at least 95% accuracy for transaction type; zero declined operations converted into Transactions; zero accepted notifications from non-allowlisted applications; fewer than 1% missed duplicates in the validation corpus; and zero raw notification messages sent to Convex.

## Out of Scope

- Bank credential collection, bank login, account aggregation, and Open Banking are permanently out of scope.
- A true, current, or available bank-account balance is permanently out of scope.
- Financial advice, credit scoring, investment advice, payment initiation, and lending are out of scope.
- Banks beyond the currently implemented Millennium capture path remain unavailable until their parsers and capture paths are verified.
- Receipt scanning and OCR are outside the MVP.
- Bank statement and file import are outside the MVP.
- A consumer web application is outside the MVP.
- Shared or family finances are planned for later and are outside the MVP.
- Transaction Split user interface is planned for later, although the domain model may reserve for it.
- Embedded machine learning, Ollama, and trained classifiers are outside the MVP.
- Lifetime Premium purchases are outside the initial release.
- Advertising, financial-data sales, and loan affiliate programs are outside the business model.

## Further Notes

The first unresolved item is evidence rather than a product decision: the team must collect 20–30 sanitized Bank Notification examples for each initial Supported Bank. Real names, account identifiers, card fragments, exact dates, and other identifying text must be replaced while preserving the structural format required for parsing.

The second unresolved item is the iOS 27 technical boundary. The proven requirement is that the user can create and approve a notification automation in Shortcuts that invokes BankStats. The implementation must not depend on programmatic automation creation until a native prototype confirms a public API. Guided manual configuration is the accepted fallback and remains a valid MVP path.

The canonical terms for implementation and tickets are User, Bank Notification, Supported Bank, Capture Configuration, Device, Financial Account, Transaction, Review Item, Diagnostic Sample, Counterparty, Merchant, Merchant Alias, Category, Categorization Rule, Transaction Split, Original Amount, Reporting Amount, Exchange Rate Snapshot, Alert Rule, and Alert.

The product should feel calm, direct, and private. It should provide precise descriptions of observed data and limitations without exposing implementation terminology in ordinary user flows.
