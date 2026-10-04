import ExpoModulesCore

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

    AsyncFunction("listRecords") { () -> [[String: Any]] in
      try EncryptedOutbox.shared.records().map(\.dictionary)
    }

    AsyncFunction("storageDiagnostics") { () -> [String: String] in
      try EncryptedOutbox.shared.diagnostics()
    }
  }
}
