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
    do {
      let record = try EncryptedOutbox.shared.ingest(
        rawText: notificationText,
        sourceApp: sourceApp
      )
      recordAttempt { $0.recordSuccess() }
      let label = record.merchant ?? record.transactionType ?? "transaction"
      return .result(dialog: "Saved \(label), \(record.amountMinor) minor units")
    } catch {
      let reasonCode = (error as? IngestionError)?.reasonCode ?? "unknown"
      recordAttempt { $0.recordFailure(reasonCode) }
      throw error
    }
  }

  /// The automation runs unattended, so this attempt log is the only trace left once a
  /// failure is swallowed by Shortcuts. Best-effort: if the App Group itself is unreachable
  /// there is nowhere shared left to record to, and the original error still propagates.
  private func recordAttempt(_ write: (IngestionAttemptLog) -> Void) {
    guard let configuration = try? IngestionConfiguration.current() else {
      return
    }
    write(IngestionAttemptLog(configuration: configuration))
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
