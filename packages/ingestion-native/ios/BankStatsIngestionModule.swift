import ExpoModulesCore
import Foundation

public final class BankStatsIngestionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BankStatsIngestion")

    Function("configureSpendingWidget") { (configuration: String) in
      try SpendingWidgetUpdater.shared.configure(configuration)
    }

    AsyncFunction("ingestSynthetic") { () -> [String: Any] in
      let outcome = try EncryptedOutbox.shared.ingest(
        subtitle: SyntheticSample.millennium.subtitle,
        body: SyntheticSample.millennium.body,
        sourceApp: SyntheticSample.sourceApp
      )
      guard case .record(let record) = outcome else {
        throw IngestionError.unsupportedNotification
      }
      return record.dictionary
    }

    AsyncFunction("ingestSyntheticApplePayTransaction") { () -> [String: Any] in
      let outcome = try EncryptedOutbox.shared.ingest(
        subtitle: SyntheticSample.applePay.subtitle,
        body: SyntheticSample.applePay.body,
        sourceApp: SyntheticSample.sourceApp
      )
      guard case .record(let record) = outcome else {
        throw IngestionError.unsupportedNotification
      }
      return record.dictionary
    }

    AsyncFunction("deleteSyntheticRecords") { () -> Int in
      try EncryptedOutbox.shared.deleteSyntheticRecords()
    }

    AsyncFunction("clearRecords") {
      try EncryptedOutbox.shared.clear()
    }

    AsyncFunction("saveRecord") { (input: TransactionInput) -> [String: Any] in
      let record = try input.normalized()
      try EncryptedOutbox.shared.save(record)
      return record.dictionary
    }

    AsyncFunction("deleteRecord") { (id: String) -> Int in
      try EncryptedOutbox.shared.delete(id: id)
    }

    AsyncFunction("saveRecordAndRememberBank") { (input: TransactionInput) -> [String: Any] in
      try EncryptedOutbox.shared.saveAndRememberBank(input.normalized()).dictionary
    }

    AsyncFunction("extractPdfText") { (uri: String) -> String in
      try StatementPdfText.extract(from: uri)
    }

    AsyncFunction("listRecords") { () -> [[String: Any]] in
      try EncryptedOutbox.shared.records().map(\.dictionary)
    }

    AsyncFunction("listNotificationDiagnostics") { (offset: Int) -> [[String: Any]] in
      try EncryptedOutbox.shared.notificationDiagnostics(offset: offset)
    }

    AsyncFunction("retryNotification") { (id: String) -> [String: String] in
      switch try EncryptedOutbox.shared.retryNotification(id: id) {
      case .record:
        return ["status": "saved"]
      case .ignored(let reason):
        return ["status": "ignored", "reasonCode": reason]
      case .pending(let reason):
        return ["status": "pending", "reasonCode": reason]
      }
    }

    AsyncFunction("restoreNotification") { (id: String, input: TransactionInput) -> [String: Any] in
      try EncryptedOutbox.shared.restoreNotification(id: id) { notification in
        let corrected = input
        corrected.id = notification.id
        corrected.capturedAt = ISO8601DateFormatter().string(from: notification.capturedAt)
        corrected.origin = NormalizedRecordOrigin.manual
        corrected.bank = NormalizedRecordOrigin.manual
        corrected.sourceApp = NormalizedRecordOrigin.manual
        return try corrected.normalized()
      }.dictionary
    }

    AsyncFunction("readDocument") { (key: String) -> String? in
      try EncryptedOutbox.shared.readDocument(key: key)
    }

    AsyncFunction("writeDocument") { (key: String, value: String) in
      try EncryptedOutbox.shared.writeDocument(key: key, value: value)
    }

    AsyncFunction("deleteDocument") { (key: String) in
      try EncryptedOutbox.shared.deleteDocument(key: key)
    }

    AsyncFunction("storageDiagnostics") { () -> [String: String] in
      try EncryptedOutbox.shared.diagnostics()
    }
  }
}
