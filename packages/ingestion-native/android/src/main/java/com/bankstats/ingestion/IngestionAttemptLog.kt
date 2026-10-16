package com.bankstats.ingestion

import android.content.Context

class IngestionAttemptLog(context: Context, configuration: IngestionConfiguration) {
  private val preferences = context.applicationContext
    .getSharedPreferences(configuration.attemptLogName, Context.MODE_PRIVATE)

  fun reset() {
    preferences.edit().apply { keys.values.forEach { remove(it) } }.commit()
  }

  fun snapshot(): Map<String, String> =
    keys.mapNotNull { (field, key) -> preferences.getString(key, null)?.let { field to it } }.toMap()

  private companion object {
    val keys = mapOf(
      "lastAttemptAt" to "com.bankstats.ingestion.lastAttemptAt",
      "lastAttemptOutcome" to "com.bankstats.ingestion.lastAttemptOutcome",
      "lastAttemptFailureReason" to "com.bankstats.ingestion.lastAttemptFailureReason",
      "lastFailureAt" to "com.bankstats.ingestion.lastFailureAt",
      "lastFailureReason" to "com.bankstats.ingestion.lastFailureReason"
    )
  }
}
