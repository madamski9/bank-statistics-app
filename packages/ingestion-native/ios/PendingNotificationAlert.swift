import Foundation
import OSLog
import UserNotifications

public enum PendingNotificationAlert {
  static let kind = "notificationInbox"
  private static let identifier = "bankstats.pending-notification"
  private static let configurationKey = "bankstats.widget.configuration"
  private static let logger = Logger(subsystem: "com.bankstats.ingestion", category: "pending-notification")

  private struct Message {
    let title: String
    let body: String
  }

  private static let polish = Message(
    title: "Transakcja nie została zapisana",
    body: "Nie rozpoznaliśmy powiadomienia z banku. Stuknij, aby je sprawdzić i zapisać transakcję."
  )

  private static let english = Message(
    title: "Transaction not saved",
    body: "We could not recognize a bank notification. Tap to review it and save the transaction."
  )

  public static func announce() async {
    let message = usesPolish() ? polish : english
    let content = UNMutableNotificationContent()
    content.title = message.title
    content.body = message.body
    content.sound = .default
    content.userInfo = ["kind": kind]
    let request = UNNotificationRequest(identifier: identifier, content: content, trigger: nil)
    do {
      try await UNUserNotificationCenter.current().add(request)
    } catch {
      logger.error("Could not announce a notification awaiting recognition")
    }
  }

  private static func usesPolish() -> Bool {
    if let language = appLanguage() {
      return language == "pl"
    }
    return Locale.preferredLanguages.first?.hasPrefix("pl") == true
  }

  private static func appLanguage() -> String? {
    guard let configuration = try? IngestionConfiguration.current(),
      let defaults = UserDefaults(suiteName: configuration.appGroupIdentifier),
      let stored = defaults.dictionary(forKey: configurationKey)
    else {
      return nil
    }
    return stored["language"] as? String
  }
}
