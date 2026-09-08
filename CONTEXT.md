# Personal Finance Monitoring

This context describes how personal financial activity is inferred from messages sent by supported Polish banks.

## Language

**User**:
A private individual in Poland who uses the product to understand their personal cash flow.
_Avoid_: Customer, account holder

**Bank Notification**:
A raw message emitted by a supported bank application that may contain one or more facts about financial activity.
_Avoid_: Transaction, bank operation

**Supported Bank**:
A bank or banking application serving users in Poland whose notification formats are explicitly recognized by the product.
_Avoid_: Data source, provider

**Capture Configuration**:
A user's configuration for capturing notifications from one supported bank on one device. It can be working, require attention, or remain unconfigured.
_Avoid_: Bank, financial account

**Device**:
An installation authorized by a user to capture bank notifications, synchronize transactions, and receive alerts.
_Avoid_: User, session

**Financial Account**:
A bank account, card account, or currency account to which transactions belong. When a bank notification cannot identify one, transactions use a user-renamable general account for that bank.
_Avoid_: Bank, user account

**Transaction**:
A normalized movement of money inferred from one or more bank notifications or entered manually by the user. It has an income or expense direction and can be pending, posted, or reversed.
_Avoid_: Notification, alert, bank operation

**Review Item**:
An uncertain interpretation of a bank notification that does not affect statistics until the user confirms or corrects it.
_Avoid_: Transaction, error

**Diagnostic Sample**:
A user-approved, redacted copy of one problematic bank notification submitted to improve recognition rules.
_Avoid_: Bank notification, telemetry event

**Counterparty**:
A person or organization on the other side of a transfer or other financial movement.
_Avoid_: Merchant, sender, recipient

**Merchant**:
A business at which the user made a purchase. Merchant statistics exclude personal counterparties.
_Avoid_: Counterparty, store label

**Merchant Alias**:
A bank-provided merchant label recognized as referring to a canonical merchant.
_Avoid_: Merchant, category

**Category**:
A classification used to group transactions by purpose. Transactions may remain uncategorized without being excluded from cash-flow statistics.
_Avoid_: Merchant, transaction type

**Categorization Rule**:
A user-approved rule that assigns a category to future matching transactions.
_Avoid_: Correction, merchant alias

**Transaction Split**:
An allocation of one transaction's amount across multiple categories while preserving the original transaction total.
_Avoid_: Separate transaction, installment

**Original Amount**:
The amount and currency reported by the bank for a transaction.
_Avoid_: Reporting amount, converted amount

**Reporting Amount**:
The value of a transaction expressed in the user's reporting currency for statistics. The default reporting currency is PLN.
_Avoid_: Original amount, current value

**Exchange Rate Snapshot**:
The NBP exchange rate assigned to a transaction for its occurrence date and retained so historical reporting amounts remain stable.
_Avoid_: Current rate, live rate

**Alert Rule**:
A user-defined condition over transactions, a scope, and a time period that determines when the product sends an alert.
_Avoid_: Notification, reminder

**Alert**:
A message generated when an alert rule reaches one of its configured thresholds.
_Avoid_: Bank notification, alert rule
