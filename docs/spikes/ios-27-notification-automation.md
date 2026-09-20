# iOS 27 notification automation spike

## Result

iOS 27 adds a notification personal-automation trigger that can select a source application and
filter notification content. BankStats exposes `Capture Millennium Notification` as a background
App Intent. The intent receives text from the automation, normalizes it locally, discards the raw
text, and writes only the normalized record to an App Group SQLCipher database. The encryption key
is generated on-device and stored in Keychain with `AfterFirstUnlockThisDeviceOnly` accessibility
so background work remains possible while the device is locked after its first unlock.

The React Native diagnostic card reads the same encrypted outbox after launch. It also provides a
synthetic input button for simulator and development-build verification.

## Wallet (Portfel): one automation, both source apps

Millennium's card-payment push never names the merchant (only "Płatność kartą debetową: Kwota:
..."), so `Capture Millennium Notification` recognizes that shape and deliberately discards it
rather than saving a poorer-detail duplicate. The merchant name comes from Wallet's own push for
the same purchase instead (e.g. "Bank Millennium S.A. / Inmedio Gdańsk, Pomorskie / 7,49 zł").

There is no public API to read another app's notification content or Wallet's transaction history
directly (`PKPassLibrary` exposes enrolled cards, not a transaction feed) — this still has to go
through a personal automation. On this device, Portfel (Wallet) *is* selectable as an additional
source app in the same generic "notification received" trigger used for Millennium: the trigger
supports an OR'd list of source apps (`Millennium` or `Portfel`), so one automation calling the one
`Capture Millennium Notification` action covers both. `MillenniumNotificationNormalizer` tells the
two shapes apart by the text itself, not by which app triggered it — the automation passes a static
`Source App` value regardless of which of the two apps actually fired it.

If Portfel ever isn't offered as a source app on some device/iOS combination, Shortcuts' separate
Wallet **Transaction** trigger (Automation > New Automation > Wallet > "When I tap") is the fallback
documented by Apple, firing on tap-to-pay only (not online/in-app purchases) with its own delay
against card-issuer settlement — but it would need its own App Intent taking structured
merchant/amount/card parameters rather than raw text, since that trigger doesn't expose a
notification body.

## Public API boundary

App Intents is the public API for making a BankStats action discoverable to Shortcuts. It does not
provide an API for an application to create, install, or approve a user's personal automation.
Apple documents personal automations as device-specific user configuration. Shortcuts can be shared
manually through an iCloud link or exported file, but the notification trigger and its approval are
personal-automation configuration and are not carried as an installable automation artifact.

The supported product path is therefore guided manual setup. BankStats may deep-link to the
Shortcuts app, but it must not claim that it created or enabled the automation.

## Guided manual setup

1. Install and launch a BankStats development build once so iOS indexes its App Intent.
2. Open Shortcuts and create a new shortcut named `BankStats — Millennium`.
3. Add the BankStats action `Capture Millennium Notification`.
4. Set `Notification Text` to the notification's content (the dynamic "Treść" variable) and leave
   `Source App` as `com.bankmillennium.mobile`.
5. Add the `Notification` automation trigger.
6. As the notification source, select both `Millennium` and `Portfel` (Wallet) — the trigger
   accepts more than one app, matching on either.
7. Enable immediate automatic execution and approve every prompt presented by iOS.
8. Lock the device after it has been unlocked at least once since restart.
9. Verify each shape lands correctly:
   - Deliver the synthetic notification `Płatność kartą: 12,34 PLN w SKLEP TEST.` from Millennium;
     confirm the diagnostic card shows `SKLEP TEST`, `−12.34 PLN`, `Millennium`, `pending`.
   - Trigger a real or synthetic Millennium debit push containing just "Płatność..." with no
     merchant; confirm it does *not* appear as a record, and the diagnostic card's last-attempt
     status reads `ignored` rather than `failure`.
   - Trigger the matching Wallet push for the same card (e.g. "Bank Millennium S.A. / SKLEP TEST /
     12,34 zł"); confirm it *does* appear as a record with the merchant name.

## Validation record

Automated validation covers normalization, SQLCipher database creation, App Group entitlements,
native module discovery, and the React Native diagnostic surface on an iOS 27 simulator. A simulator
cannot prove locked-device delivery behavior or the exact approval prompts shown on a real device.

The real-device validation must record:

- device model and iOS 27 build;
- BankStats build identifier and application lane;
- whether the automation ran while locked without opening BankStats;
- SQLCipher version shown by the diagnostic card;
- the normalized record fields and capture timestamp;
- confirmation that no network request contains the raw synthetic text;
- screenshots of the notification trigger, automatic-execution approval, locked-screen result, and
  diagnostic card.

Until that record is attached to issue #2, the two real-device acceptance criteria remain unproven.

## Sources

- [What’s new in Shortcuts, WWDC26](https://developer.apple.com/videos/play/wwdc2026/310/)
- [App Intents](https://developer.apple.com/documentation/appintents)
- [App Intent supported modes](https://developer.apple.com/documentation/appintents/appintent/supportedmodes)
- [Sharing shortcuts on iPhone or iPad](https://support.apple.com/guide/shortcuts/apdf01f8c054/ios)
- [Transaction triggers in Shortcuts on iPhone or iPad](https://support.apple.com/guide/shortcuts/transaction-trigger-apd65c67538a/ios)
- [Keychain accessibility after first unlock](https://developer.apple.com/documentation/security/ksecattraccessibleafterfirstunlock)
- [Sharing Keychain items with App Groups](https://developer.apple.com/documentation/security/sharing-access-to-keychain-items-among-a-collection-of-apps)
