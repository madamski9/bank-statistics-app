package com.bankstats.ingestion

import expo.modules.kotlin.exception.CodedException

sealed class IngestionException(
  val reasonCode: String,
  message: String,
  cause: Throwable? = null
) : CodedException(message, cause) {
  class Keystore(cause: Throwable) :
    IngestionException("keystore", "Keystore operation failed: ${cause.message}", cause)

  class Database(detail: String, cause: Throwable? = null) :
    IngestionException("database", "Encrypted outbox operation failed: $detail", cause)

  class UnsupportedNotification :
    IngestionException("unsupportedNotification", "The notification does not match a supported bank format")

  class ParserRulesUnavailable(cause: Throwable? = null) :
    IngestionException("parserRulesUnavailable", "The bundled bank notification rules could not be loaded", cause)

  class InvalidRecord :
    IngestionException(
      "invalidRecord",
      "The transaction needs a positive amount, a direction and a three-letter currency"
    )
}
