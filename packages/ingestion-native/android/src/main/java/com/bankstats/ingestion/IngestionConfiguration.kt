package com.bankstats.ingestion

import android.content.Context
import java.io.File

data class IngestionConfiguration(
  val databaseFile: File,
  val keyFile: File,
  val keyAlias: String,
  val attemptLogName: String
) {
  companion object {
    fun current(context: Context): IngestionConfiguration {
      val directory = context.applicationContext.noBackupFilesDir
      return IngestionConfiguration(
        databaseFile = File(directory, "bankstats-outbox.sqlite"),
        keyFile = File(directory, "bankstats-outbox.key"),
        keyAlias = "com.bankstats.ingestion.outbox.sqlcipher-key-v1",
        attemptLogName = "com.bankstats.ingestion.attempts"
      )
    }
  }
}
