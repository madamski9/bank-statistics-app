package com.bankstats.ingestion

import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BankStatsIngestionModule : Module() {
  private val outbox: EncryptedOutbox
    get() = EncryptedOutbox.shared(appContext.reactContext ?: throw Exceptions.ReactContextLost())

  override fun definition() = ModuleDefinition {
    Name("BankStatsIngestion")

    AsyncFunction("ingestSynthetic") {
      ingest(SyntheticSample.millennium)
    }

    AsyncFunction("ingestSyntheticApplePayTransaction") {
      ingest(SyntheticSample.applePay)
    }

    AsyncFunction("deleteSyntheticRecords") {
      outbox.deleteSyntheticRecords()
    }

    AsyncFunction("clearRecords") {
      outbox.clear()
    }

    AsyncFunction("saveRecord") { input: TransactionInput ->
      val record = input.normalized()
      outbox.save(record)
      record.toMap()
    }

    AsyncFunction("deleteRecord") { id: String ->
      outbox.delete(id)
    }

    AsyncFunction("listRecords") {
      outbox.records().map { it.toMap() }
    }

    AsyncFunction("readDocument") { key: String ->
      outbox.readDocument(key)
    }

    AsyncFunction("writeDocument") { key: String, value: String ->
      outbox.writeDocument(key, value)
    }

    AsyncFunction("deleteDocument") { key: String ->
      outbox.deleteDocument(key)
    }

    AsyncFunction("storageDiagnostics") {
      outbox.diagnostics()
    }
  }

  private fun ingest(sample: SyntheticSample.Notification): Map<String, Any> {
    val outcome = outbox.ingest(subtitle = sample.subtitle, body = sample.body, sourceApp = SyntheticSample.SOURCE_APP)
    val record = (outcome as? NormalizationOutcome.Record)?.record ?: throw IngestionException.UnsupportedNotification()
    return record.toMap()
  }
}
