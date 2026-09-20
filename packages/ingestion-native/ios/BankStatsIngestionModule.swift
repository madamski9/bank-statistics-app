import ExpoModulesCore

public final class BankStatsIngestionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BankStatsIngestion")

    AsyncFunction("ingestSynthetic") { () -> [String: Any] in
      let outcome = try EncryptedOutbox.shared.ingest(
        rawText: "Płatność kartą: 12,34 PLN w SKLEP TEST.",
        sourceApp: "com.bankmillennium.mobile"
      )
      guard case .record(let record) = outcome else {
        throw IngestionError.unsupportedNotification
      }
      return record.dictionary
    }

    AsyncFunction("ingestSyntheticApplePayTransaction") { () -> [String: Any] in
      let outcome = try EncryptedOutbox.shared.ingest(
        rawText: "Bank Millennium S.A.\nSKLEP TEST\n12,34 zł",
        sourceApp: "com.bankmillennium.mobile"
      )
      guard case .record(let record) = outcome else {
        throw IngestionError.unsupportedNotification
      }
      return record.dictionary
    }

    AsyncFunction("listRecords") { () -> [[String: Any]] in
      try EncryptedOutbox.shared.records().map(\.dictionary)
    }

    AsyncFunction("storageDiagnostics") { () -> [String: String] in
      try EncryptedOutbox.shared.diagnostics()
    }
  }
}
