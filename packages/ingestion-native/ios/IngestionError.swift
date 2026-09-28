import Foundation
import Security

enum IngestionError: LocalizedError {
  case missingAppGroupConfiguration
  case unavailableAppGroupContainer(String)
  case keychain(OSStatus)
  case database(String)
  case unsupportedNotification

  var errorDescription: String? {
    switch self {
    case .missingAppGroupConfiguration:
      return "BankStats ingestion App Group is not configured"
    case .unavailableAppGroupContainer(let identifier):
      return "The App Group container is unavailable: \(identifier)"
    case .keychain(let status):
      return "Keychain operation failed with status \(status)"
    case .database(let message):
      return "Encrypted outbox operation failed: \(message)"
    case .unsupportedNotification:
      return "The notification does not match a supported bank format"
    }
  }

  /// A coarse, stable code safe to persist in the shared App Group attempt log. Unlike
  /// `errorDescription`, this never varies with interpolated detail, so it can be recorded
  /// without risking that a future case starts embedding notification content.
  var reasonCode: String {
    switch self {
    case .missingAppGroupConfiguration:
      return "missingAppGroupConfiguration"
    case .unavailableAppGroupContainer:
      return "unavailableAppGroupContainer"
    case .keychain:
      return "keychain"
    case .database:
      return "database"
    case .unsupportedNotification:
      return "unsupportedNotification"
    }
  }
}
