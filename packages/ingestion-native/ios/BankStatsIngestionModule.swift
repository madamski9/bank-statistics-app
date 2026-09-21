import ExpoModulesCore

public final class BankStatsIngestionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BankStatsIngestion")

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

    AsyncFunction("listRecords") { () -> [[String: Any]] in
      try EncryptedOutbox.shared.records().map(\.dictionary)
    }

    AsyncFunction("storageDiagnostics") { () -> [String: String] in
      try EncryptedOutbox.shared.diagnostics()
    }
  }
}
