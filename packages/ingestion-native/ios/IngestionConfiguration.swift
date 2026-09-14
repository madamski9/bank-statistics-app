import Foundation

struct IngestionConfiguration {
  let appGroupIdentifier: String
  let databaseURL: URL

  static func current() throws -> IngestionConfiguration {
    guard let appGroupIdentifier = Bundle.main.object(
      forInfoDictionaryKey: "BankStatsIngestionAppGroup"
    ) as? String else {
      throw IngestionError.missingAppGroupConfiguration
    }

    guard let containerURL = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: appGroupIdentifier
    ) else {
      throw IngestionError.unavailableAppGroupContainer(appGroupIdentifier)
    }

    return IngestionConfiguration(
      appGroupIdentifier: appGroupIdentifier,
      databaseURL: containerURL.appendingPathComponent("bankstats-outbox.sqlite")
    )
  }
}
