import AppIntents
internal import BankStatsIngestion

@available(iOS 27.0, *)
struct IngestMillenniumNotificationIntent: AppIntent {
  static let title: LocalizedStringResource = "Capture Bank Notification"
  static let description = IntentDescription(
    "Saves a bank notification locally in the encrypted BankStats inbox before recognizing its transaction."
  )
  static let supportedModes: IntentModes = .background

  @Parameter(title: "Notification Title")
  var notificationTitle: String?

  @Parameter(title: "Notification Subtitle")
  var notificationSubtitle: String

  @Parameter(title: "Notification Body")
  var notificationBody: String

  @Parameter(title: "Source App")
  var sourceApp: String

  init() {
    notificationSubtitle = ""
    notificationBody = ""
    sourceApp = "pl.millenniumbank.bankmillennium"
  }

  func perform() async throws -> some IntentResult & ProvidesDialog {
    let result = try NotificationCapture.capture(
      title: notificationTitle ?? "",
      subtitle: notificationSubtitle,
      body: notificationBody,
      sourceApp: sourceApp
    )
    switch result {
    case .saved(let label, let amountMinor):
      return .result(dialog: "Saved \(label), \(amountMinor) minor units")
    case .notTransaction:
      return .result(dialog: "Not a transaction - nothing saved")
    case .awaitingApplePay:
      return .result(dialog: "Ignored - waiting for the matching Apple Pay transaction")
    case .alreadySaved:
      return .result(dialog: "Already saved from the matching Apple Pay transaction")
    case .queued:
      return .result(dialog: "Notification saved securely on this phone, awaiting recognition")
    }
  }
}

@available(iOS 27.0, *)
struct BankStatsAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: IngestMillenniumNotificationIntent(),
      phrases: ["Capture a bank notification in \(.applicationName)"],
      shortTitle: "Capture Notification",
      systemImageName: "tray.and.arrow.down.fill"
    )
  }
}
