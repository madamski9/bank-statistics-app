# Exclude financial data from telemetry

Crash reports and product analytics must not contain transaction amounts, counterparties, merchants, bank-notification text, or screen recordings. The product accepts reduced diagnostic detail to keep ordinary telemetry outside the financial-data path; a problematic notification can leave the device only through a separate, explicit redacted-sample flow.
