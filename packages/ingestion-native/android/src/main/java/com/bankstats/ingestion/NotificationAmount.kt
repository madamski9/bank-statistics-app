package com.bankstats.ingestion

object NotificationAmount {
  private val whitespace = Regex("\\s")
  private val digits = Regex("^[0-9]+$")
  private val twoDigits = Regex("^[0-9]{2}$")

  fun minorUnits(value: String): Long? {
    val parts = value
      .replace(whitespace, "")
      .replace(",", ".")
      .split(".")
      .filter { it.isNotEmpty() }

    if (parts.isEmpty() || parts.size > 2 || !digits.matches(parts[0])) {
      return null
    }

    val whole = parts[0].toLongOrNull() ?: return null
    val fraction = parts.getOrElse(1) { "" }.take(2).padEnd(2, '0')

    if (!twoDigits.matches(fraction)) {
      return null
    }

    return whole * 100 + fraction.toLong()
  }
}
