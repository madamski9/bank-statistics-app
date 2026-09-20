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
4. Set `Notification Text` to the shortcut input and leave `Source App` as
   `com.bankmillennium.mobile`.
5. Add the `Notification` automation trigger.
6. Select the Millennium application as the notification source.
7. Enable immediate automatic execution and approve every prompt presented by iOS.
8. Lock the device after it has been unlocked at least once since restart.
9. Deliver the synthetic notification `Płatność kartą: 12,34 PLN w SKLEP TEST.` from the selected
   source application.
10. Launch BankStats and confirm the diagnostic card shows `SKLEP TEST`, `−12.34 PLN`,
    `Millennium`, and `pending`.

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
- [Keychain accessibility after first unlock](https://developer.apple.com/documentation/security/ksecattraccessibleafterfirstunlock)
- [Sharing Keychain items with App Groups](https://developer.apple.com/documentation/security/sharing-access-to-keychain-items-among-a-collection-of-apps)
