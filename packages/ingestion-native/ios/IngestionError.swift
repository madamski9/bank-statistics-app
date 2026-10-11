import Foundation
import Security

enum IngestionError: LocalizedError {
  case missingAppGroupConfiguration
  case unavailableAppGroupContainer(String)
  case keychain(OSStatus)
  case database(String)
  case unsupportedNotification
  case parserRulesUnavailable
  case invalidRecord
  case unreadableStatement

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
    case .parserRulesUnavailable:
      return "The bundled bank notification rules could not be loaded"
    case .invalidRecord:
      return "The transaction needs a positive amount, a direction and a three-letter currency"
    case .unreadableStatement:
      return "The statement PDF could not be opened"
    }
  }

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
    case .parserRulesUnavailable:
      return "parserRulesUnavailable"
    case .invalidRecord:
      return "invalidRecord"
    case .unreadableStatement:
      return "unreadableStatement"
    }
  }
}
