# Evaluate alert rules in Convex

Convex evaluates alert rules after normalized transactions synchronize and records one push job for each reached threshold. A server-side outbox sends jobs through the Expo Push Service and tracks delivery receipts instead of assuming immediate delivery. Central evaluation may delay an alert while a device is offline, but prevents duplicate alerts across devices and provides one consistent view of active rules and their periods.
