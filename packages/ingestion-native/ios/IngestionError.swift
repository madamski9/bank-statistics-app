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
      return "The notification does not match a supported Millennium format"
    }
  }
}
