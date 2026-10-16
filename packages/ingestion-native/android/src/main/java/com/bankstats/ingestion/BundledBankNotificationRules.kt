package com.bankstats.ingestion

import android.content.Context

object BundledBankNotificationRules {
  const val ASSET_NAME = "bank-notification-rules.json"

  @Volatile
  private var interpreter: BankNotificationInterpreter? = null

  fun interpreter(context: Context): BankNotificationInterpreter {
    interpreter?.let { return it }

    return synchronized(this) {
      interpreter ?: load(context).also { interpreter = it }
    }
  }

  private fun load(context: Context): BankNotificationInterpreter =
    try {
      val source = context.assets.open(ASSET_NAME).bufferedReader(Charsets.UTF_8).use { it.readText() }
      BankNotificationInterpreter(BankNotificationRuleBundle.parse(source))
    } catch (error: Exception) {
      throw IngestionException.ParserRulesUnavailable(error)
    }
}
