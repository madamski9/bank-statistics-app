package com.bankstats.ingestion

object SyntheticSample {
  data class Notification(val subtitle: String, val body: String)

  val millennium = Notification(
    subtitle = "",
    body = "Płatność kartą: 12,34 PLN w SKLEP TEST."
  )
  val applePay = Notification(
    subtitle = "SKLEP TEST  Gdańsk, Pomorskie",
    body = "12,34 zł"
  )
  const val SOURCE_APP = "pl.millenniumbank.bankmillennium"
  const val MERCHANT = "SKLEP TEST"
}
