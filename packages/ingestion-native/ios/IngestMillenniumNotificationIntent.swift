import AppIntents

@available(iOS 27.0, *)
public struct IngestMillenniumNotificationIntent: AppIntent {
  public static let title: LocalizedStringResource = "Capture Millennium Notification"
  public static let description = IntentDescription(
    "Normalizes a Millennium notification locally and saves it in the encrypted BankStats outbox."
  )
  public static let supportedModes: IntentModes = .background

  @Parameter(title: "Notification Text")
  public var notificationText: String

  @Parameter(title: "Source App")
  public var sourceApp: String

  public init() {
    notificationText = ""
    sourceApp = "com.bankmillennium.mobile"
  }

  public func perform() async throws -> some IntentResult & ProvidesDialog {
    let record = try EncryptedOutbox.shared.ingest(
      rawText: notificationText,
      sourceApp: sourceApp
    )
    return .result(dialog: "Saved \(record.merchant), \(record.amountMinor) minor units")
  }
}

@available(iOS 27.0, *)
public struct BankStatsAppShortcuts: AppShortcutsProvider {
  public static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: IngestMillenniumNotificationIntent(),
      phrases: ["Capture a bank notification in \(.applicationName)"],
      shortTitle: "Capture Notification",
      systemImageName: "tray.and.arrow.down.fill"
    )
  }
}
