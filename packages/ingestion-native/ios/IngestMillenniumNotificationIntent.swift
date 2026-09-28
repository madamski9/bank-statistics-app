import AppIntents

@available(iOS 27.0, *)
public struct IngestMillenniumNotificationIntent: AppIntent {
  public static let title: LocalizedStringResource = "Capture Bank Notification"
  public static let description = IntentDescription(
    "Normalizes a Millennium or PKO BP notification locally and saves it in the encrypted BankStats outbox."
  )
  public static let supportedModes: IntentModes = .background

  @Parameter(title: "Notification Title")
  public var notificationTitle: String?

  @Parameter(title: "Notification Subtitle")
  public var notificationSubtitle: String

  @Parameter(title: "Notification Body")
  public var notificationBody: String

  @Parameter(title: "Source App")
  public var sourceApp: String

  public init() {
    notificationSubtitle = ""
    notificationBody = ""
    sourceApp = "pl.millenniumbank.bankmillennium"
  }

  public func perform() async throws -> some IntentResult & ProvidesDialog {
    do {
      let outcome = try EncryptedOutbox.shared.ingest(
        title: notificationTitle ?? "",
        subtitle: notificationSubtitle,
        body: notificationBody,
        sourceApp: sourceApp
      )
      switch outcome {
      case .record(let record):
        IngestionAttemptLog.record { $0.recordSuccess() }
        let label = record.merchant ?? record.transactionType ?? "transaction"
        return .result(dialog: "Saved \(label), \(record.amountMinor) minor units")
      case .ignored(let reasonCode):
        IngestionAttemptLog.record { $0.recordIgnored(reasonCode) }
        if reasonCode == IgnoredReason.notTransaction {
          return .result(dialog: "Not a transaction - nothing saved")
        }
        return .result(dialog: "Ignored - waiting for the matching Apple Pay transaction")
      }
    } catch {
      let reasonCode = (error as? IngestionError)?.reasonCode ?? "unknown"
      IngestionAttemptLog.record { $0.recordFailure(reasonCode) }
      throw error
    }
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
