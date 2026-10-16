import Foundation
import JavaScriptCore
import OSLog
import UserNotifications
import WidgetKit

final class SpendingWidgetUpdater: @unchecked Sendable {
  static let shared = SpendingWidgetUpdater()

  private let lock = NSLock()
  private let configurationKey = "bankstats.widget.configuration"
  private let logger = Logger(subsystem: "com.bankstats.ingestion", category: "widget")
  private let screens = [
    "SpendingWidget": "month",
    "SpendingWatchWidget": "watch",
    "SpendingLimitsWidget": "limits",
    "SpendingShopsWidget": "shops",
  ]

  func configure(_ configuration: String) throws {
    lock.lock()
    defer { lock.unlock() }
    let defaults = try sharedDefaults()
    guard let data = configuration.data(using: .utf8),
      let parsed = try JSONSerialization.jsonObject(with: data) as? [String: Any],
      parsed["enabled"] is Bool
    else {
      throw IngestionError.database("Invalid widget configuration")
    }
    defaults.set(parsed, forKey: configurationKey)
    try publish(configuration: parsed, defaults: defaults)
  }

  func refresh(capturedRecordId: String? = nil) {
    lock.lock()
    defer { lock.unlock() }
    do {
      let defaults = try sharedDefaults()
      guard let configuration = defaults.dictionary(forKey: configurationKey) else { return }
      try publish(configuration: configuration, defaults: defaults, capturedRecordId: capturedRecordId)
    } catch {
      logger.error("Could not refresh spending widgets")
    }
  }

  private func sharedDefaults() throws -> UserDefaults {
    let configuration = try IngestionConfiguration.current()
    guard let defaults = UserDefaults(suiteName: configuration.appGroupIdentifier) else {
      throw IngestionError.unavailableAppGroupContainer(configuration.appGroupIdentifier)
    }
    return defaults
  }

  private func publish(
    configuration: [String: Any],
    defaults: UserDefaults,
    capturedRecordId: String? = nil
  ) throws {
    let enabled = configuration["enabled"] as? Bool == true
    if !enabled {
      for name in screens.keys {
        let key = "__expo_widgets_\(name)_timeline"
        defaults.set([["timestamp": Int(Date().timeIntervalSince1970 * 1000), "props": [
          "status": "signedOut", "openUrl": configuration["openUrl"] as? String ?? "",
        ]]], forKey: key)
        WidgetCenter.shared.reloadTimelines(ofKind: name)
      }
      return
    }

    let frameworkBundle = Bundle(for: SpendingWidgetUpdater.self)
    guard let bundleURL = frameworkBundle.url(forResource: "BankStatsWidgets", withExtension: "bundle"),
      let resourceBundle = Bundle(url: bundleURL),
      let scriptURL = resourceBundle.url(forResource: "SpendingWidgetCalculator", withExtension: "js"),
      let context = JSContext()
    else {
      throw IngestionError.database("Widget calculator is unavailable")
    }

    context.evaluateScript(try String(contentsOf: scriptURL, encoding: .utf8))
    guard context.exception == nil else {
      throw IngestionError.database("Widget calculator could not load")
    }
    let records = try EncryptedOutbox.shared.records().map(\.dictionary)
    let timestamp = Int(Date().timeIntervalSince1970 * 1000)
    let calculator = context.objectForKeyedSubscript("BankStatsWidgetCalculator")
    guard let result = calculator?.invokeMethod("timeline", withArguments: [configuration, records, timestamp]),
      context.exception == nil,
      let entries = result.toArray() as? [[String: Any]]
    else {
      throw IngestionError.database("Widget snapshot could not be calculated")
    }

    for (name, screen) in screens {
      let screenEntries = entries.map { entry -> [String: Any] in
        var screenEntry = entry
        var props = entry["props"] as? [String: Any] ?? [:]
        props["screen"] = screen
        screenEntry["props"] = props
        return screenEntry
      }
      defaults.set(screenEntries, forKey: "__expo_widgets_\(name)_timeline")
      WidgetCenter.shared.reloadTimelines(ofKind: name)
    }

    if let capturedRecordId {
      announceLimits(
        calculator: calculator,
        context: context,
        arguments: [configuration, records, capturedRecordId, timestamp]
      )
    }
  }

  private func announceLimits(calculator: JSValue?, context: JSContext, arguments: [Any]) {
    guard let result = calculator?.invokeMethod("paymentAlerts", withArguments: arguments),
      context.exception == nil,
      let messages = result.toArray() as? [[String: Any]]
    else {
      logger.error("Could not evaluate shop limits")
      return
    }

    let center = UNUserNotificationCenter.current()
    let delivered = DispatchGroup()

    for message in messages {
      guard let title = message["title"] as? String, let body = message["body"] as? String else { continue }
      let content = UNMutableNotificationContent()
      content.title = title
      content.body = body
      content.sound = .default
      let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
      delivered.enter()
      center.add(request) { [logger] error in
        if error != nil {
          logger.error("Could not deliver a shop limit alert")
        }
        delivered.leave()
      }
    }

    _ = delivered.wait(timeout: .now() + 5)
  }
}
