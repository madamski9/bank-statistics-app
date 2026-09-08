# Convert currencies centrally with NBP snapshots

Convex will obtain and cache the NBP rate for a transaction's occurrence date, calculate the PLN reporting amount, and persist the exact rate used. Central conversion keeps every device consistent and historical totals stable; a temporary NBP failure leaves conversion pending without blocking transaction ingestion.
