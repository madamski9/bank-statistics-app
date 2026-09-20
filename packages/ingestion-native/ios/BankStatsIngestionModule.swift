import ExpoModulesCore

public final class BankStatsIngestionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BankStatsIngestion")

    AsyncFunction("ingestSynthetic") { () -> [String: Any] in
      try EncryptedOutbox.shared.ingest(
        rawText: SyntheticSample.rawText,
        sourceApp: SyntheticSample.sourceApp
      ).dictionary
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
