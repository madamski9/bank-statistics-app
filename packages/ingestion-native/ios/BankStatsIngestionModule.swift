import ExpoModulesCore

public final class BankStatsIngestionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BankStatsIngestion")

    AsyncFunction("ingestSynthetic") { () -> [String: Any] in
      try EncryptedOutbox.shared.ingest(
        rawText: "Płatność kartą: 12,34 PLN w SKLEP TEST.",
        sourceApp: "com.bankmillennium.mobile"
      ).dictionary
    }

    AsyncFunction("listRecords") { () -> [[String: Any]] in
      try EncryptedOutbox.shared.records().map(\.dictionary)
    }

    AsyncFunction("storageDiagnostics") { () -> [String: String] in
      try EncryptedOutbox.shared.diagnostics()
    }
  }
}
