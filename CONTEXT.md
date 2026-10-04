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

**Custom Category**:
A category the user creates and names in addition to the built-in categories. Deleting it returns its transactions to automatic recognition.
_Avoid_: Tag, label

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
The NBP mid rate published on or before a transaction's occurrence date in Poland, together with its effective date and table number, retained on the transaction so historical reporting amounts remain stable.
_Avoid_: Current rate, live rate

**Event**:
A named period such as a trip or a renovation that gathers the transactions made while it lasts, whatever their category. A transaction can be assigned to an event or excluded from it by hand.
_Avoid_: Tag, budget, project

**Recurring Payment**:
A payment to the same merchant or counterparty that repeats at a regular weekly, monthly, quarterly, or yearly interval with a similar amount, such as a subscription or rent. It is inferred from history, never declared by the bank.
_Avoid_: Standing order, subscription plan

**Spending Forecast**:
An estimate of the current calendar month's expenses from the spending so far, the discretionary daily pace, and recurring payments still due. It is an estimate, never a promise or a balance.
_Avoid_: Budget, prediction

**Monthly Report**:
A Premium review of one calendar month in the spirit of a screen time report: the daily average expense compared with the previous month, spending day by day, where the money goes, where the user pays most often, highlights such as the most expensive day and no-spend days, and the month's income, recurring payments, and events.
_Avoid_: Statement, monthly summary

**Capture Health**:
The evidence-based state of a Capture Configuration: working, requiring attention, or unconfigured, derived from captured transactions and recent automation runs.
_Avoid_: Connection status

**Alert Rule**:
A user-defined condition over transactions, a scope, and a time period that determines when the product sends an alert.
_Avoid_: Notification, reminder

**Alert**:
A message generated when an alert rule reaches one of its configured thresholds.
_Avoid_: Bank notification, alert rule
